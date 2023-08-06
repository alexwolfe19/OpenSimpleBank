// Imports
import { Router } from 'express';
// import logger from '../logger';
import { RestrictedAccessMiddlewear } from '../middlewear/identitygate';
import { PrismaClient } from '@prisma/client';
import { createCurrency } from '../utils/currency';
import { assert } from '../utils/general';

// Get database connection
const dbcon = new PrismaClient();

// Create our apps
const currency_route = Router();

currency_route.use(RestrictedAccessMiddlewear);

currency_route.post('/', async (req, res) => {
    console.log('Creating a new currency!');
    const userid: number =  assert(res.locals.userid, 'Unable to get user ID!');
    const signSymbol =      assert(req.body.symbol, 'Unable to get symbol!');
    const grouping =        Number(req.body.grouping);
    const decimalCount =    Number(req.body.decimals);
    const shortName =       assert(req.body.short_name, 'Unable to get short name');
    const longName =        assert(req.body.long_name, 'Unable to get long name');
    const volume =          Number(assert(req.body.volume, 'Unable to get volume'));

    try {
        const currencyid = await createCurrency(userid, signSymbol, shortName, longName, grouping, decimalCount, volume);
        res.status(200).json({
            message: 'Currency created!',
            refrence: currencyid
        });
    } catch (e) {
        console.error(e);
    }
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
currency_route.get('/list/', async (req, res) => {
    const currency_list = await dbcon.currency.findMany({
        select: {
            id: true,
            ownerId: false,
            currencySign: true,
            longName: true,
            shortName: true,
            volume: true,
            liquidity: true,
            Owner: {
                select: {
                    username: true,
                    id: true,
                }
            }
        }
    });

    if (currency_list == null || currency_list == undefined) {
        console.log('Failed to fetch currency!');
        res.status(500).json([]);
    } else {
        res.status(200).json(currency_list);
    }
});



// Export the app :D
export default currency_route;