// Imports
import { Router } from 'express';
// import logger from '../logger';
import { RestrictedAccessMiddlewear } from '../middlewear/identitygate';
import { PrismaClient } from '@prisma/client';

// Get database connection
const dbcon = new PrismaClient();

// Create our apps
const currency_route = Router();

currency_route.use(RestrictedAccessMiddlewear);

function assert<T>(value: T, message?: string): T {
    if (value == null || value == undefined) throw new Error(message);
    return value;
}

function safelyAssert<T>(value: T, defval: T): T {
    if (value == null || value == undefined) return defval;
    return value;
}

currency_route.post('/create/', async (req, res) => {
    console.log('Creating a new currency!');
    const userid: number =  assert(res.locals.userid, 'Unable to get user ID!');
    const signSymbol =      assert(req.body.symbol, 'Unable to get symbol!');
    const grouping =        Number(safelyAssert(req.body.grouping, 3));
    const decimalCount =    Number(safelyAssert(req.body.decimals, 0));
    const shortName =       assert(req.body.short_name, 'Unable to get short name');
    const longName =        assert(req.body.long_name, 'Unable to get long name');
    const volume =          Number(assert(req.body.volume, 'Unable to get volume'));

    // 2. Validate inputs

    const result = await dbcon.currency.create({data:{
        ownerId: userid,
        currencySign: signSymbol,
        groupingSize: grouping,
        decimalCount: decimalCount,
        shortName: shortName,
        longName: longName,
        volume: volume,
        liquidity: 0
    }});

    if (result == null || result == undefined) {
        console.log('Failed to create currency!');
        res.status(500).json({message: 'Failed to create currency!'});
    } else {
        console.log('Currency created!');
        res.status(200).send('Currency created!');
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