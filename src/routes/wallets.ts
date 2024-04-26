// Imports
import { Router } from 'express';
// import logger from '../logger';
import { RestrictedAccessMiddlewear } from '../middlewear/identitygate';
import { PrismaClient } from '@prisma/client';
import { assert, isnull } from '../utils/general';
import { TokenData } from '../utils/identity';
import winston from 'winston';

// Get database connection
const dbcon = new PrismaClient();

// Create our apps
const app = Router();

app.use(RestrictedAccessMiddlewear);

app.post('/', async (req, res) => {
    const logger: winston.Logger = res.locals.logger;

    const tokend: TokenData | undefined = res.locals.tokenData;
    if (tokend == undefined) 
        return logger.warn('Not authenticated', () => res.status(401).json({message: 'Not authenticated!'}));

    let applicationId: string | undefined = req.body.application_id;
    let userid = tokend.userId;

    if (applicationId == '@me') {
        if (userid == undefined) 
            return res.status(400).json({ message: 'No application specified!' });
        const user = await dbcon.userAccount.findUnique({ where: { id: userid }, select: { defaultApplicationId: true } });
        applicationId = user!.defaultApplicationId!;
    }

    if (applicationId == undefined)
        return res.status(400).json({ message: 'No application ID specified' });

    const currencyId: string | undefined = req.body.currency_id;
    const nickname: string | undefined = req.body.nickname;

    if (currencyId == undefined)
        return res.status(400).json({ message: 'No currency ID specified' });

    try {
        const wallet = await dbcon.wallet.create({data:{
            balance: 0,
            ownerId: applicationId,
            currencyId: currencyId,
            nickname: nickname
        }});

        if (wallet == undefined) 
            return res.status(500).json({ message: 'Failed to create wallet!' });

        return res.status(200).json({ _ref: wallet.id, message: 'Wallet created' });
    } catch (e) {
        return res.status(500).json({ message: 'Failed to create wallet!' });
    }
});

app.get('/list/', async (req, res) => {
    const tokend: TokenData | undefined  = res.locals.tokenData;
    const targetId: string | undefined = req.body.owner_id;

    let query: { 
        ownerId?: string, 
        Memberships?: { some?: { accountId?: string } } 
    } = { ownerId: targetId };

    if (tokend == undefined)
        return res.status(401).json({ message: 'Token not provided' });

    if (targetId == '@me' || targetId == undefined || targetId == '') {
        if (tokend.userId == undefined)
            return res.status(401).json({ message: 'Attempted to use @me without being logged in' });
        query = { Memberships: { some: { accountId: tokend.userId} }};
    }

    const wallets = await dbcon.wallet.findMany({
        where: { Owner: query },
        select: { id: true, balance: true, nickname: true }
    });

    res.json(wallets);
});

app.get('/:address/transactions/', async (req, res) => {
    const tokend: TokenData | undefined  = res.locals.tokenData;
    const wallet_address: string = req.params.address;

    // They *need* to be authenticated here
    if (tokend == undefined) return res.status(501).json({ message: 'No application specified!' });

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