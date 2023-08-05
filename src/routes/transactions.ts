// Imports
import { Router } from 'express';
// import logger from '../logger';
import { RestrictedAccessMiddlewear } from '../middlewear/identitygate';
import { PrismaClient, TransactionStatus } from '@prisma/client';

// Get database connection
const dbcon = new PrismaClient();

// Create our apps
const app = Router();

app.use(RestrictedAccessMiddlewear);


app.post('/begin/', async (req, res) => {
    console.log('Creating a transaction');
    const userid: number = res.locals.userid;
    const source_wallet_key = req.body.debtor;
    const dest_wallet_key = req.body.creditor;
    const trans_value = Number(req.body.value);

    // Step 1. Get our wallets
    const source_wallet = await dbcon.wallet.findUnique({where: { id: source_wallet_key }, select: { balance: true, Owners: true, masterId: true }});
    
    if (source_wallet == null || source_wallet == undefined) {
        return res.status(403).send({
            code: 'no_such_source',
            message: 'The specified source does not exist!'
        });
    }

    // Step 2. Validate if the current user is allowed to make transactions with that wallet
    let authorised = (source_wallet?.masterId == userid);
    if (!authorised) {
        const owners = source_wallet!.Owners;
        owners.forEach(owner => {
            if (owner.accountId != userid) return;
            if (owner.mayAuthorNewTransactions) authorised = true;
        });
    }
    if (!authorised) {
        return res.status(401).send({
            code: 'unauth',
            message: 'You are not authorised to make this transfer!'
        });
    }

    // Step 3. Validate if the balance is sufficent for the transaction
    if (source_wallet!.balance < trans_value) {
        return res.status(403).send({
            code: 'wallet_balance_insuf',
            message: 'Not enough money in source account!'
        });
    }

    // Step 4. Execute the transaction
    try {
        await dbcon.$transaction([
            dbcon.transaction.create({data:{
                debtorId: source_wallet_key,
                creditorId: dest_wallet_key,
                value: trans_value,
                status: TransactionStatus.PROCESSED,
                debtorHeadline: 'TRANSFER FROM USER',
                debtorDescription: 'Transfer baby :3'
            }}),
            dbcon.wallet.update({
                where: {id: source_wallet_key},
                data: {balance:{decrement:trans_value}}
            }),
            dbcon.wallet.update({
                where: {id: dest_wallet_key},
                data: {balance:{increment:trans_value}}
            })
        ]);

        console.log('Make it rain!');
        return res.json({
            code: 'okay',
            message: 'Transaction sent!'
        });
    } catch(e) {
        console.error('TRAN FAIL!');
        console.error(e);
        return res.status(500).json({
            code: 'trans_fail',
            message: 'Transaction failed to be posted'
        });
    } 
});

app.get('/list/', async (req, res) => {
    const userid: number = res.locals.userid;

    const wallets = await dbcon.wallet.findMany({where: {
        OR: [
            {Owners: {
                some: {accountId: userid}
            }},
            {masterId: userid}
        ]
    }});

    res.json(wallets);
});

// Export the app :D
export default app;