// Imports
import { Router } from 'express';
// import logger from '../logger';
import { OptionalIdentificationMiddlewear, RestrictedAccessMiddlewear } from '../middlewear/identitygate';
import { PrismaClient, TransactionStatus } from '@prisma/client';
import { createCurrency } from '../utils/currency';
import { assert, isnull } from '../utils/general';
import { canMakeCurrencyForApplication, canMakeGrantForCurrency, canMakeWalletForCurrency } from '../utils/permissions';
import { TokenData } from '../utils/identity';

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
    const signSymbol =      assert(req.body.symbol, 'Unable to get symbol!');
    const grouping =        Number(req.body.grouping);
    const decimalCount =    Number(req.body.decimals);
    const shortName =       assert(req.body.short_name, 'Unable to get short name');
    const longName =        assert(req.body.long_name, 'Unable to get long name');
    const volume =          Number(assert(req.body.volume, 'Unable to get volume'));
    const tokend: TokenData = res.locals.tokenData;
    let applicationId = req.body.application_id;

    let allowed = false;

    if (isnull(applicationId) || req.body.application_id == '' || req.body.application_id == '@me') {
        // assert(tokend.userId, 'No user ID is specified!');

        // const user = await dbcon.userAccount.findUnique({ where: { id: tokend.userId }, select: { defaultApplicationId: true } });
        // applicationId = user!.defaultApplicationId!;
        applicationId = tokend.applicationId;
    }

    console.table(tokend);

    if (isnull(applicationId)) return res.status(401).json({message: 'No application ID provided!'});

    if (isnull(tokend)) return res.status(401).json({ message: 'No authentication provided!' });
    allowed = await canMakeCurrencyForApplication(tokend.publicKey, applicationId);

    if (!allowed) return res.status(401).json({ message: 'You are not authorised to create a currency for that application!', applicationId: applicationId });

    try {
        const currencyid = await createCurrency(applicationId, signSymbol, shortName, longName, grouping, decimalCount, volume);
        res.status(200).json({
            message: 'Currency created!',
            refrence: currencyid
        });
    } catch (e) {
        console.error(e);
    }
});

currency_route.post('/:uuid/grant/', async (req, res) => {
    const tokend: TokenData = res.locals.tokenData;
    const currencyAddress =     assert(req.params.uuid, '[GRANT] No currency address!');
    const message = (req.body.message);
    const creditor = assert(req.body.creditor);
    const amount = Number(assert(req.body.amount));
    let allowed = false;

    if (amount < 0)
        return res.status(401).json({ message: 'Negative grants not allowed!' });

    // Check to see if one or the other is provided (if they have, they're **already validated**)
    if (isnull(tokend)) return res.status(401).json({ message: 'No authentication provided!' });
    else allowed = await canMakeGrantForCurrency(tokend, currencyAddress);

    // Validate the wallet can receice grants from this currency
    const target_wallet = await dbcon.wallet.findFirst({ where: { id: creditor } });
    const source_currency = await dbcon.currency.findFirst({ where: { id: currencyAddress } });

    if (target_wallet?.currencyId != source_currency?.id)
        return res.status(401).json({ message: 'Currency ID mismatch!' });

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