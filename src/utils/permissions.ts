import { isnull } from "./general";
import { TokenData } from "./identity";
import { PrismaClient } from '@prisma/client';

// Get database connection
const dbcon = new PrismaClient();

type Token = string | TokenData;

export async function applyDefaultPermissionToToken(target: Token) {

}

export async function canMakeCurrencyForApplication(actor: Token, applicationID: string): Promise<boolean> {
    try {
        if (actor == '@me') throw new Error(); // NO @ME IN UTILS
        else if (typeof(actor) != 'string') 
            actor = (actor as TokenData).publicKey;
        const tokend = await dbcon.token.findFirst({ where: {identity: actor} })

        if (tokend?.applicationId == applicationID) return true;
        return false;
    } catch(e) {
        return false;
    }
}

export async function canMakeWalletForCurrency(actor: Token, currencyID: string): Promise<boolean> {
    try {
        return true;
    } catch(e) {
        return false;
    }
    return false;
}

export async function canMakeGrantForCurrency(actor: Token, currencyID: string): Promise<boolean> {
    try {
        if (typeof(actor) != 'string') 
            actor = (actor as TokenData).publicKey;
        const tokend = await dbcon.token.findFirst({ where: {identity: actor} });
        const currencyd = await dbcon.currency.findFirst({ where: {id: currencyID} });

        return (tokend?.applicationId == currencyd?.ownerId);
    } catch(e) {
        return false;
    }
    return false;
}

export async function canUserLogin(userID: string): Promise<boolean> {
    try {
        const userEntry = await dbcon.userAccount.findUnique({
            where: { id: userID }
        });
        if (isnull(userEntry)) return false;
        return userEntry!.canLogin;
    } catch(e) {
        return false;
    }
}

export async function canCreateApplicationFor(actor: Token, targetUser: string): Promise<boolean> {
    try {

    } catch(e) {
        return false;
    }
    return false;
}

export async function canStartTransactionFor(actor: Token, targetAccount: string): Promise<boolean> {
    try {
        if (typeof(actor) != 'string') 
            actor = (actor as TokenData).publicKey;
        const tokend = await dbcon.token.findFirst({ where: {identity: actor} });

        return (tokend?.userId == targetAccount);
    } catch(e) {
        return false;
    }
    return false;
}