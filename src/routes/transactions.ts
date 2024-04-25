// Imports
import { Router } from 'express';
// import logger from '../logger';
import { RestrictedAccessMiddlewear } from '../middlewear/identitygate';
import { PrismaClient } from '@prisma/client';
import { beginTransaction } from '../utils/transaction';
import { BalanceInsufficentError, CurrencyMismatchError, NoSuchWalletError, UserUnauthorisedError } from '../utils/errors';
import { isnull } from '../utils/general';
import { TokenData } from '../utils/identity';

// Get database connection
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const dbcon = new PrismaClient();

// Create our apps
const app = Router();

app.use(RestrictedAccessMiddlewear);


app.post('/', async (req, res) => {
    // console.log('Creating a transaction');
    const tokend: TokenData = res.locals.tokenData;
    const source_wallet_key = req.body.debtor;
    const dest_wallet_key = req.body.creditor;
    const trans_value = Number(req.body.value);

    if (isnull(tokend)) return res.status(401).json({message: 'Not authorised!'});

    try {
        const transaction_id = await beginTransaction(source_wallet_key, dest_wallet_key, trans_value, tokend.publicKey);
        return res.json({
            code: 'okay',
            message: 'Transaction created!',
            refrence: transaction_id
        });
    } catch (e) {
        if (e instanceof NoSuchWalletError) {
            const offending_address = (e as NoSuchWalletError).address;
            console.error(`Unable to find wallet (${offending_address})!`);
            return res.status(403).send({
                code: 'no_such_wallet',
                message: 'The specified wallet does not exist!',
                refrence: offending_address
            });
        } else if (e instanceof UserUnauthorisedError) {
            return res.status(401).send({
                code: 'unauth',
                message: 'You are not authorised to make this transfer!'
            });
        } else if (e instanceof BalanceInsufficentError) {
            return res.status(403).send({
                code: 'wallet_balance_insuf',
                message: 'Not enough money in source account!'
            });
        } else if (e instanceof CurrencyMismatchError) {
            return res.status(403).send({
                code: 'wallet_currency_mismatch',
                message: 'The destination wallet is not the same currency!'
            });
        } else {
            return res.status(500).json({
                code: 'trans_fail',
                message: 'Transaction failed to be posted'
            });
        }
    }
});

app.get('/list/', async (req, res) => {
    res.send('');
});

// Export the app :D
export default app;