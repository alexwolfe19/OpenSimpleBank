// Imports
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

// Load some config
const SALT_ROUNDS = Number(process.env.SALT_ROUNDS) || 10;
const TOKEN_LIFESPAN = Number(process.env.TOKEN_LIFESPAN) || 60*60*60*1000; // One hour, by default

// Errors
class InvalidLoginCredentialsError extends Error {
    constructor(username: string, password: string) {
        super(`("${username}", "${password})`);
    }
}
class NoSuchUserError extends Error {}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
class MissingRequiredParametersError extends Error {}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
class UnknownError extends Error {}

// Get database connection
const dbcon = new PrismaClient();

// Interfaces
interface UserSessionData {
    identity: string
    creation: Date,
    expires: Date
}

// Internals
async function storeToken(userid: number, token: UserSessionData) {
    const payload = {
        userId: userid,
        identity: token.identity,
        sessionCreatedOn: token.creation,
        sessionExpiresOn: token.expires,
    };
    await dbcon.userSessions.create({data: payload});
}

async function synthNewToken(): Promise<UserSessionData> {
    const identity = uuidv4();
    const timestamp = new Date(Date.now());
    const expires_on = new Date(timestamp.getTime() + TOKEN_LIFESPAN);
    return {
        identity: identity,
        creation: timestamp,
        expires: expires_on
    };
}

async function createUser(username: string, password: string, email: string | undefined) {
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const account = await dbcon.userAccount.create({
        data: { username: username, passwordHash: passwordHash, email: email }
    });

    return account;
}

async function validateUserLogin(username: string, password: string): Promise<number> {
    const potentialUser = await dbcon.userAccount.findUnique({ where:{ username: username }});

    // Check if we couldn't find anyone!
    if (potentialUser == null || potentialUser == undefined) throw new NoSuchUserError();

    // Validate the password
    const doHashesMatch = await bcrypt.compare(password, potentialUser.passwordHash);
    if (doHashesMatch) return potentialUser!.id;
    else throw new InvalidLoginCredentialsError(potentialUser!.username, potentialUser!.passwordHash);
}

async function generateUserSession(accountid: number) : Promise<UserSessionData> {
    const token = await synthNewToken();
    await storeToken(accountid, token);
    return token;
}

async function validateUserSession(identity: string) : Promise<{valid: boolean, userid: number | undefined}> {
    const session = await dbcon.userSessions.findUnique({
        where: { identity: identity }
    });
    if (session == null || session == undefined) return {valid: false, userid: undefined};
    if (!session.valid) return {valid: false, userid: undefined};
    return {valid: true, userid: session.userId};
}

export { createUser, validateUserLogin, generateUserSession, synthNewToken, storeToken, validateUserSession, UnknownError, NoSuchUserError, InvalidLoginCredentialsError, MissingRequiredParametersError };