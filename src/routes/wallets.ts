// Imports
import { Router } from 'express';
// import logger from '../logger';
import { RestrictedAccessMiddlewear } from '../middlewear/identitygate';
import { PrismaClient } from '@prisma/client';
import { assert, isnull } from '../utils/general';
import { TokenData } from '../utils/identity';

// Get database connection
const dbcon = new PrismaClient();

// Create our apps
const app = Router();

app.use(RestrictedAccessMiddlewear);

app.post('/', async (req, res) => {
    const tokend: TokenData = res.locals.tokenData;
    if (isnull(tokend)) return res.status(401).json({message: 'Not authenticated!'});

    let applicationId = req.body.application_id;
    let userid = tokend.userId;

    if (isnull(applicationId) || req.body.application_id == '@me') {
        if (isnull(userid)) return res.status(501).json({ message: 'No application specified!' });
        const user = await dbcon.userAccount.findUnique({ where: { id: userid }, select: { defaultApplicationId: true } });
        applicationId = user!.defaultApplicationId!;
    }

    const currencyId: string = assert(req.body.currency_id, 'No currencyId!');
    const nickname: string = req.body.nickname;
    try {
        const wallet = await dbcon.wallet.create({data:{
            balance: 0,
            ownerId: applicationId,
            currencyId: currencyId,
            nickname: nickname
        }});

        // console.log('I ADDED A FLUFFING WALLET!', wallet.id, wallet.ownerId);

        if (isnull(wallet)) return res.status(500).json({ message: 'Failed to create wallet!' });
        res.status(200).send('Wallet created!');
    } catch (e) {
        return res.status(500).json({ message: 'Failed to create wallet!' });
    }
});

app.get('/list/', async (req, res) => {
    const userid: string = res.locals.userid;
    const targetId: string = req.body.owner_id;

    let query: { ownerId?: string, Memberships?: { some?: { accountId?: string } } } = { ownerId: targetId };

    if (targetId == '@me' || isnull(targetId) || targetId == '') {
        query = { Memberships: { some: { accountId: userid} }};
    }

    const wallets = await dbcon.wallet.findMany({
        where: { Owner: query },
        select: { id: true, balance: true, nickname: true }
    });

    res.json(wallets);
});

app.get('/:address/transactions/', async (req, res) => {
    const userid = res.locals.userid;
    const wallet_address = req.params.address;

    // They *need* to be authenticated here
    if (isnull(userid)) return res.status(501).json({ message: 'No application specified!' });

    try {
        const transactions = await dbcon.transaction.findMany({
            where: {
                OR: [
                    { debtorId: wallet_address },
                    { creditorId: wallet_address }
                ]
            },
            select: {
                id: true,
                debtorId: true,
                creditorId: true,
                value: true,
                partialValue: true,
                status: true,
                createdOn: true,
                lastUpdatedOn: true,
                debtorHeadline: true,
                debtorDescription: true
            }
        });

        res.status(200).json({
            message: 'got it',
            data: transactions
        });
    } catch (e) {
        res.status(500).json({message: 'fuck'});
    }



});

// Export the app :D
export default app;