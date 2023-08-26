// Imports
import { PrismaClient } from '@prisma/client';
// Get database connection
const dbcon = new PrismaClient();

export async function createCurrency(applicationId: number, symbol: string, shortName: string, longName: string, grouping: number = 3, decimals: number = 0, volume?: number) : Promise<string> {
    // console.log(`Creating currency for application (${applicationId})`);
    const currency = await dbcon.currency.create({data:{
        ownerId: applicationId,
        currencySign: symbol,
        groupingSize: grouping,
        decimalCount: decimals,
        shortName: shortName,
        longName: longName,
        volume: volume,
        liquidity: 0
    }});

    return currency.id;
}