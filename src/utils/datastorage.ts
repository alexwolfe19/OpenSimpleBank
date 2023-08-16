import { PrismaClient } from '@prisma/client';

export function prismaClientFactory() : PrismaClient {
    const dbcon = new PrismaClient();
    return dbcon;
}