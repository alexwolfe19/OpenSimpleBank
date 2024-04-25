// Imports
import { Prisma, PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { InvalidLoginCredentialsError, InvalidPasswordError, InvalidTokenSecret, InvalidUsernameError, MissingRequiredParametersError, NoSuchTokenError, NoSuchUserError } from './errors';
import { isnull } from './general';

// Load some config
const SALT_ROUNDS = Number(process.env.SALT_ROUNDS) || 10;
const TOKEN_LIFESPAN = Number(process.env.TOKEN_LIFESPAN) || 60*60*60*1000; // One hour, by default

export interface TokenData {
    publicKey: string,
    privateKey?: string,
    userId?: string,
    applicationId?: string,
    issuedOn?: Date,
    expiresOn?: Date,
}

// Get database connection
const dbcon = new PrismaClient();

// Interfaces
type Nothing = undefined | null;
type UserSessionData = [secret: string, issued: Date, expires: Date];

// Internals
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

    // await dbcon.permissionRecord.create({
    //     data: {
    //         applicationId: defaultApplication.id,
    //         userId: account.id,
    //         permissions: [Permission.ALL]
    //     }
    // });


    return account;
}

export async function validateUserLogin(username: string, password: string): Promise<string> {
    const potentialUser = await dbcon.userAccount.findUnique({ where:{ username: username }});

    // Check if we couldn't find anyone!
    if (potentialUser == null || potentialUser == undefined) throw new NoSuchUserError();

    // Validate the password
    const doHashesMatch = await bcrypt.compare(password, potentialUser.passwordHash);
    if (doHashesMatch) return potentialUser!.id;
    else throw new InvalidLoginCredentialsError(potentialUser!.username, potentialUser!.passwordHash);
}

export async function generateToken(userId?: string, applicationId?: string, expires: boolean = true) : Promise<TokenData> {
    const secret = uuidv4();
    const secret_hash = await bcrypt.hash(secret, SALT_ROUNDS);

    if (isnull(userId) && isnull(applicationId)) {
        // Nothing provided
        throw new MissingRequiredParametersError();
    }

    const timestamp = new Date(Date.now());
    const expires_on = (expires) ? new Date(timestamp.getTime() + TOKEN_LIFESPAN) : undefined;

    const data = {
        secretHash: secret_hash,
        userId: userId,
        applicationId: applicationId,
        expiresOn: expires_on
    };

    console.table(data);

    const token = await dbcon.token.create({
        data: data
    });

    // return [token.identity, secret, token.createdOn, token.expiresOn];
    return {
        publicKey: token.identity,
        privateKey: secret,
        issuedOn: token.createdOn,
        expiresOn: expires_on,
        userId: token.userId ?? undefined,
        applicationId: token.applicationId ?? undefined,
    };
}

export enum TokenState {
    Generated = 0,
    Authenticated = 1,
    Revoked = -1
}

export async function validateToken(identity: string, secret: string) : Promise<boolean> {
    const token = await dbcon.token.findUnique({ where: { identity: identity }, select: { revoked: true, authenticated: true, secretHash: true } });
    if (isnull(token)) {
        console.log('token is null')
        return false
    }
    const secretValid = await bcrypt.compare(secret, token!.secretHash);
    if (!secretValid) {
        console.log('token secret invalid')
        return false
    } else if (token!.revoked) {
        console.log('token revoked')
        return false
    } else {
        console.log('Yay, or token is correct')
        return true;
    }
}