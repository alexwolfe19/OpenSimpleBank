// Imports
import { Router } from 'express';
// import logger from '../logger';
import { RestrictedAccessMiddlewear } from '../middlewear/identitygate';
import { PrismaClient } from '@prisma/client';
import { beginTransaction } from '../utils/transaction';
import { BalanceInsufficentError, CurrencyMismatchError, NoSuchWalletError, UserUnauthorisedError } from '../utils/errors';
import { isnull } from '../utils/general';
import { TokenData } from '../utils/identity';
import winston from 'winston';

// Get database connection
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const dbcon = new PrismaClient();

// Create our apps
const app = Router();

app.use(RestrictedAccessMiddlewear);

app.post('/', async (req, res) => {
    // console.log('Creating a transaction');
    const logger: winston.Logger = res.locals.logger;
    const tokend: TokenData | undefined  = res.locals.tokenData;
    const source_wallet_key: string | undefined = req.body.debtor;
    const dest_wallet_key: string | undefined = req.body.creditor;
    const trans_value: number | undefined = req.body.value;

    logger.info('Processing request to create transaction.');

    if (tokend == undefined)
        return res.status(401).json({message: 'Not authorised!'});

    if (source_wallet_key == undefined)
        return res.status(400).json({ message: 'Debitor not provided' });

    if (dest_wallet_key == undefined)
        return res.status(400).json({ message: 'Creditor not provided' });

    if (trans_value == undefined)
        return res.status(400).json({ message: 'Transaction value not provided' });

    try {
        const transaction_id = await beginTransaction(source_wallet_key, dest_wallet_key, trans_value, tokend.publicKey);
        return res.status(200).json({
            code: 'okay',
            message: 'Transaction created!',
            refrence: transaction_id
        });
    } catch (e) {
        if (e instanceof NoSuchWalletError) {
            const offending_address = (e as NoSuchWalletError).address;
            logger.error(`Unable to find wallet (${offending_address})!`);
            return res.status(403).send({
                code: 'no_such_wallet',
                message: 'The specified wallet does not exist!',
                refrence: offending_address
            });
        } else if (e instanceof UserUnauthorisedError) {
            logger.error('User not authorised to make transaction');
            return res.status(401).send({
                code: 'unauth',
                message: 'You are not authorised to make this transfer!'
            });
        } else if (e instanceof BalanceInsufficentError) {
            logger.error('Insufficent balance');
            return res.status(403).send({
                code: 'wallet_balance_insuf',
                message: 'Not enough money in source account!'
            });
        } else if (e instanceof CurrencyMismatchError) {
            logger.error('Currency mismatch');
            return res.status(403).send({
                code: 'wallet_currency_mismatch',
                message: 'The destination wallet is not the same currency!'
            });
        } else {
            logger.error('Transaction failed to post');
            return res.status(500).json({
                code: 'trans_fail',
                message: 'Transaction failed to be posted'
            });
        }
    }
});

// Export the app :D
export default app;