// Imports
import { Router } from 'express';
// import logger from '../logger';
import { OptionalIdentificationMiddlewear, RestrictedAccessMiddlewear } from '../middlewear/identitygate';
import { PrismaClient, TransactionStatus } from '@prisma/client';
import { createCurrency } from '../utils/currency';
import { assert, isnull } from '../utils/general';
import { canMakeCurrencyForApplication, canMakeGrantForCurrency, canMakeWalletForCurrency } from '../utils/permissions';
import { TokenData } from '../utils/identity';
import winston from 'winston';

// Get database connection
const dbcon = new PrismaClient();

// Create our apps
const currency_route = Router();

currency_route.use(OptionalIdentificationMiddlewear);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
currency_route.get('/list/', async (req, res) => {
    const logger: winston.Logger = res.locals.logger;

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
    const logger: winston.Logger = res.locals.logger;
    logger.info('Received request to create new currency');
    const signSymbol: string | undefined = req.body.symbol;
    const grouping: number | undefined = req.body.grouping;
    const decimalCount: number | undefined = req.body.decimals;
    const shortName: string | undefined = req.body.short_name;
    const longName: string | undefined = req.body.long_name;
    const volume: number | undefined = req.body.volume;
    const tokend: TokenData | undefined = res.locals.tokenData;
    let applicationId: string | undefined = req.body.application_id;

    if (tokend == undefined) 
        return res.status(401).json({ message: 'No authentication provided!' });

    if (applicationId == '@me') {
        if (tokend.userId == undefined)
            return res.status(401).json({ message: 'Attempting to use @me on undefined user' });
        const user = await dbcon.userAccount.findUnique({
            where: { id: tokend.userId },
            select: { defaultApplicationId: true }
        });
        if (user == undefined)
            return res.status(401).json({ message: 'Attempting to use @me on undefined user' });
    }

    if (applicationId == undefined)
        return res.status(400).json({ message: 'Missing application_id!' });

    if (signSymbol == undefined)
        return res.status(400).json({ message: 'Missing symbol sign' });

    if (shortName == undefined)
        return res.status(400).json({ message: 'Missing short name' });

    if (longName == undefined)
        return res.status(400).json({ message: 'Missing long name' });

    let allowed = await canMakeCurrencyForApplication(tokend.publicKey, applicationId);

    if (!allowed) 
        return res
            .status(401)
            .json({ 
                message: 'You are not authorised to create a currency for that application!', 
                applicationId: applicationId 
            });

    try {
        const currencyid = await createCurrency(applicationId, signSymbol, shortName, longName, grouping, decimalCount, volume);
        return res.status(200).json({
            message: 'Currency created!',
            refrence: currencyid
        });
    } catch (e) {
        logger.error(e);
        return res.status(500).json({});
    }
});

currency_route.post('/:uuid/grant/', async (req, res) => {
    const logger: winston.Logger = res.locals.logger;
    const tokend: TokenData | undefined = res.locals.tokenData;
    const currencyAddress: string = req.params.uuid;
    const message: string | undefined = req.body.message;
    const creditor: string | undefined = req.body.creditor;
    const ammount: number | undefined = req.body.amount;

    logger.info('Processing request to issue grant');

    if (tokend == undefined)
        return res.status(401).json({ message: 'No authentication provided!' });

    if (ammount == undefined)
        return res.status(400).json({ message: 'No ammount variable provided!' });
    else if (ammount < 0)
        return res.status(400).json({ message: 'Negative grants not allowed!' });

    if (creditor == undefined)
        return res.status(400).json({ message: 'No creditor defined' });

    let allowed = await canMakeGrantForCurrency(tokend, currencyAddress);

    // Validate the wallet can receice grants from this currency
    const target_wallet = await dbcon.wallet.findFirst({ where: { id: creditor } });
    const source_currency = await dbcon.currency.findFirst({ where: { id: currencyAddress } });

    if (target_wallet == undefined)
        return res.status(500).json({ message: 'Target wallet does not exist!' });

    if (source_currency == undefined)
        return res.status(500).json({ message: 'Source currency does not exist!' });

    if (target_wallet.currencyId != source_currency.id)
        return res.status(401).json({ message: 'Currency ID mismatch!' });

    if (!allowed) 
        return res.status(401).json({ message: 'You are not authorised to issue a grant!' });

    if (source_currency.liquidity + ammount > source_currency.volume)
        return res.status(401).json({ message: 'Grant would exceed volume limits' });

    try {
        const [transaction] = await dbcon.$transaction([
            dbcon.transaction.create({data:{
                creditorId: creditor,
                value: ammount,
                status: TransactionStatus.PROCESSED,
                debtorHeadline: `Grant from ${tokend.applicationId ?? 'Somebody'}`,
                debtorDescription: message
            }}),
            dbcon.wallet.update({
                where: {id: creditor},
                data: {balance:{increment:ammount}}
            }),
            dbcon.currency.update({
                where: { id: currencyAddress },
                data: { liquidity:{increment:ammount} }
            })
        ]);

        logger.info('Grant issued');
        return res.status(200).json({ message: 'Grant created!', transaction_id: transaction.id });
    } catch(e) {
        logger.error(e);
        return res.status(500).json({ message: 'UwU i messed up' });
    }
});

// Export the app :D
export default currency_route;