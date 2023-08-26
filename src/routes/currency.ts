// Imports
import { Router } from 'express';
// import logger from '../logger';
import { OptionalIdentificationMiddlewear, RestrictedAccessMiddlewear } from '../middlewear/identitygate';
import { PrismaClient, TransactionStatus } from '@prisma/client';
import { createCurrency } from '../utils/currency';
import { assert, isnull } from '../utils/general';
import { canTokenCreateAccountFor, canTokenMakeGrantFromCurrency, canUserCreateCurrencyFor, canUserMakeGrantFromCurrency } from '../utils/permissions';

// Get database connection
const dbcon = new PrismaClient();

// Create our apps
const currency_route = Router();

currency_route.use(OptionalIdentificationMiddlewear);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
currency_route.get('/list/', async (req, res) => {
    const logger = res.locals.logger;

    logger.info('Received request to list currencies');

    const currency_list = await dbcon.currency.findMany({
        select: {
            id: true,
            ownerId: false,
            currencySign: true,
            longName: true,
            shortName: true,
            volume: true,
            liquidity: true,
            public: true,
            Owner: {
                select: {
                    displayName: true,
                    id: true,
                }
            }
        }
    });

    if (currency_list == null || currency_list == undefined) {
        logger.warn('Failed to fetch currency!');
        res.status(500).json([]);
    } else {
        logger.info('Fetched currency list');
        res.status(200).json(currency_list);
    }
});

currency_route.use(RestrictedAccessMiddlewear);

currency_route.post('/', async (req, res) => {
    const logger = res.locals.logger;
    logger.info('Received request to create new currency');
    const userid =  res.locals.userid;
    const tokenKey = res.locals.tokenkey;
    const signSymbol =      assert(req.body.symbol, 'Unable to get symbol!');
    const grouping =        Number(req.body.grouping);
    const decimalCount =    Number(req.body.decimals);
    const shortName =       assert(req.body.short_name, 'Unable to get short name');
    const longName =        assert(req.body.long_name, 'Unable to get long name');
    const volume =          Number(assert(req.body.volume, 'Unable to get volume'));
    let applicationId = req.body.application_id;

    if (isnull(applicationId) || req.body.application_id == '' || req.body.application_id == '@me') {
        assert(userid, 'No user ID is specified!');
        const user = await dbcon.userAccount.findUnique({ where: { id: userid }, select: { defaultApplicationId: true } });
        applicationId = user!.defaultApplicationId!;
    }

    assert(applicationId, 'No application ID was specified!');

    let allowed = false;

    if (isnull(tokenKey) && isnull(userid)) return res.status(401).json({ message: 'No authentication provided!' });
    else if (isnull(tokenKey)) allowed = await canUserCreateCurrencyFor(userid, applicationId);
    else allowed = await canTokenCreateAccountFor(tokenKey, applicationId);

    if (!allowed) return res.status(401).json({ message: 'You are not authorised to create a currency for that application!', applicationId: applicationId });

    try {
        const currencyid = await createCurrency(Number(applicationId), signSymbol, shortName, longName, grouping, decimalCount, volume);
        res.status(200).json({
            message: 'Currency created!',
            refrence: currencyid
        });
    } catch (e) {
        console.error(e);
    }
});

currency_route.post('/:uuid/grant/', async (req, res) => {
    const userid =              res.locals.userid;
    const tokenKey =            res.locals.tokenkey;
    const currencyAddress =     assert(req.params.uuid, '[GRANT] No currency address!');
    const message = (req.body.message);
    const creditor = assert(req.body.creditor);
    const amount = Number(assert(req.body.amount));
    let allowed = false;

    // Check to see if one or the other is provided (if they have, they're **already validated**)
    if (isnull(tokenKey) && isnull(userid)) return res.status(401).json({ message: 'No authentication provided!' });
    else if (isnull(tokenKey) && !isnull(userid)) allowed = await canUserMakeGrantFromCurrency(userid, currencyAddress);
    else if (!isnull(tokenKey)) allowed = await canTokenMakeGrantFromCurrency(tokenKey, currencyAddress);

    if (!allowed) return res.status(401).json({ message: 'You are not authorised to issue a grant!' });

    try {
        const [transaction] = await dbcon.$transaction([
            dbcon.transaction.create({data:{
                creditorId: creditor,
                value: amount,
                status: TransactionStatus.PROCESSED,
                debtorHeadline: 'Grant issued',
                debtorDescription: message ?? 'Rawr x3 grant time'
            }}),
            dbcon.wallet.update({
                where: {id: creditor},
                data: {balance:{increment:amount}}
            }),
            dbcon.currency.update({
                where: { id: currencyAddress },
                data: { liquidity:{increment:amount} }
            })
        ]);

        return res.status(200).json({ message: 'Grant created!', transaction_id: transaction.id });
    } catch(e) {
        // console.error('frick dude', e);
        return res.status(500).json({ message: 'UwU i messed up' });
    }

});

// Export the app :D
export default currency_route;