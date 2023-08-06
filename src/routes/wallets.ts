// Imports
import { Router } from 'express';
// import logger from '../logger';
import { RestrictedAccessMiddlewear } from '../middlewear/identitygate';
import { PrismaClient } from '@prisma/client';

// Get database connection
const dbcon = new PrismaClient();

// Create our apps
const app = Router();

app.use(RestrictedAccessMiddlewear);

app.post('/create/', async (req, res) => {
    console.log('HE WANTS A WALLET!');
    const userid: number = res.locals.userid;
    const currencyId: string = req.body.currency_id;
    const nickname: string = req.body.nickname;
    
    const result = await dbcon.wallet.create({data:{
        balance: 10,
        masterId: userid,
        currencyId: currencyId,
        nickname: nickname,
        Owners: { create: { accountId: userid } }
    }});

    console.log('I ADDED A FLUFFING WALLET!', result.id, result.masterId);

    if (result == null || result == undefined || result.id == null || result.id == undefined || result.id == '') {
        console.error('WHYYYYYYYY');
        res.status(500).send(':(');
    } else {
        console.log('Sexy baby!');
        res.status(200).send('Wallet created!');
    }
});

app.get('/list/', async (req, res) => {
    const userid: number = res.locals.userid;

    const wallets = await dbcon.wallet.findMany({
        where: {
            OR: [
                {Owners: {
                    some: {accountId: userid}
                }},
                {masterId: userid}
            ],
        },
        select: {
            id: true,
            balance: true,
            nickname: true
        }
    });

    res.json(wallets);
});

// Export the app :D
export default app;