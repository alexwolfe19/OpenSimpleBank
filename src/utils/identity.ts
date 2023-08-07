// Imports
import { Permission, Prisma, PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { InvalidLoginCredentialsError, InvalidPasswordError, InvalidTokenSecret, InvalidUsernameError, MissingRequiredParametersError, NoSuchTokenError, NoSuchUserError } from './errors';
import { isnull } from './general';

// Load some config
const SALT_ROUNDS = Number(process.env.SALT_ROUNDS) || 10;
const TOKEN_LIFESPAN = Number(process.env.TOKEN_LIFESPAN) || 60*60*60*1000; // One hour, by default


// Get database connection
const dbcon = new PrismaClient();

// Types
const fatSession = Prisma.validator<Prisma.SessionArgs>()({
    include: { Token: true, Data: true }
});
type FatSession = Prisma.SessionGetPayload<typeof fatSession>

// Interfaces
type Nothing = undefined | null;
type UserSessionData = [secret: string, issued: Date, expires: Date];
type TokenData = [identity: string, secret: string, issued: Date, expires: Date | Nothing];

// Internals
async function storeSession(key: string, createdOn: Date, expiredOn?: Date, userid?: number) {
    const payload = {
        key: key,
        createdOn: createdOn,
        expiredOn: expiredOn,
        userId: userid
    };
    await dbcon.session.create({data: payload});
}

export async function getSessionData(secret: string) {
    return await dbcon.sessionStorageEntry.findMany({ where: {sessionKey: secret } });
}

export async function getSessionVariable(secret: string, key: string) {
    return await dbcon.sessionStorageEntry.findFirst({ where: {sessionKey: secret, key: key } });
}

export async function setSessionVariable(secret: string, key: string, value: string) {
    await dbcon.sessionStorageEntry.upsert({ 
        where: {sessionKey_key: { sessionKey: secret, key: key }},
        create: { sessionKey: secret, key: key, body: value },
        update: { body: value }
    });
}

async function synthNewSession(): Promise<[string, Date, Date]> {
    const identity = uuidv4();
    const timestamp = new Date(Date.now());
    const expires_on = new Date(timestamp.getTime() + TOKEN_LIFESPAN);
    return [identity, timestamp, expires_on];
}

export async function createUser(username: string, password: string, email: string | undefined, isAdmin: boolean = false, canLogin: boolean = true) {
    if (username == '') throw new InvalidUsernameError();
    if (password == '') throw new InvalidPasswordError();

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const account = await dbcon.userAccount.create({
        data: { 
            username: username, 
            passwordHash: passwordHash, 
            email: email,
            isAdmin: isAdmin,
            canLogin: canLogin,
            DefaultApplication: {
                create: {
                    displayName: `${username}'s Application`,
                    isPublic: false,
                    isInternal: true
                }
            }
        },
        include: { DefaultApplication: true }
    });
    const defaultApplication = account.DefaultApplication!;

    await dbcon.applicationMembership.create({
        data: { applicationId: defaultApplication.id, accountId: account.id, isOwner: true }
    });

    await dbcon.permissionRecord.create({
        data: {
            applicationId: defaultApplication.id,
            userId: account.id,
            permissions: [Permission.ALL]
        }
    });


    return account;
}

export async function validateUserLogin(username: string, password: string): Promise<number> {
    const potentialUser = await dbcon.userAccount.findUnique({ where:{ username: username }});

    // Check if we couldn't find anyone!
    if (potentialUser == null || potentialUser == undefined) throw new NoSuchUserError();

    // Validate the password
    const doHashesMatch = await bcrypt.compare(password, potentialUser.passwordHash);
    if (doHashesMatch) return potentialUser!.id;
    else throw new InvalidLoginCredentialsError(potentialUser!.username, potentialUser!.passwordHash);
}

export async function generateSession(accountid?: number) : Promise<UserSessionData> {
    const [token, issuedOn, expiredOn] = await synthNewSession();
    await storeSession(token, issuedOn, expiredOn, accountid);
    return [token, issuedOn, expiredOn];
}

export async function validateSession(secret: string) : Promise<{valid: boolean, session?: FatSession}> {
    const session = await dbcon.session.findUnique({
        where: { key: secret },
        select: { Token: true, revoked: true, Data: true, id: true, key: true, userId: true }
    });
    if (session == null || session == undefined) return {valid: false};
    if (session.revoked) return {valid: false};
    return {valid: true, session: session as FatSession};
}

export async function generateToken(userId?: number, applicationId?: number, expires: boolean = true) : Promise<TokenData> {
    const secret = uuidv4();
    const secret_hash = await bcrypt.hash(secret, SALT_ROUNDS);

    if (isnull(userId) && isnull(applicationId)) {
        // Nothing provided
        throw new MissingRequiredParametersError();
    }

    const timestamp = new Date(Date.now());
    const expires_on = (expires) ? new Date(timestamp.getTime() + TOKEN_LIFESPAN) : undefined;

    const token = await dbcon.token.create({
        data: {
            secretHash: secret_hash,
            userId: userId,
            applicationId: applicationId,
            expiresOn: expires_on
        }
    });

    return [token.identity, secret, token.createdOn, token.expiresOn];
}

export enum TokenState {
    Generated = 0,
    Authenticated = 1,
    Revoked = -1
}

export async function validateToken(identity: string, secret: string) : Promise<TokenState> {
    const token = await dbcon.token.findUnique({ where: { identity: identity }, select: { revoked: true, authenticated: true, secretHash: true } });
    if (isnull(token)) throw new NoSuchTokenError();
    const secretValid = await bcrypt.compare(secret, token!.secretHash);
    if (!secretValid) throw new InvalidTokenSecret();
    if (token!.revoked) return TokenState.Revoked;
    else if (token!.authenticated) return TokenState.Authenticated;
    else return TokenState.Generated;
}