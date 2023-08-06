// Imports
import { Router } from 'express';
import logger from '../logger';
import { createUser, generateSession, validateUserLogin } from '../utils/identity';
import { OptionalIdentificationMiddlewear, RestrictedAccessMiddlewear } from '../middlewear/identitygate';
import { InvalidLoginCredentialsError, NoSuchUserError } from '../utils/errors';
import { PrismaClient } from '@prisma/client';
import { assert, isnull } from '../utils/general';
import { UserInfoAccess, canUserLogin, viewTokenGrantsToUserInfo, viewUserGrantsToUserInfo } from '../utils/permissions';

// Get database connection
const dbcon = new PrismaClient();

// Create our apps
const app = Router();

app.post('/signup/', async (req, res) => {
    logger.debug('Received request to create account!');
    const username: string = req.body.username;
    const password: string = req.body.password;
    
    createUser(username, password, undefined).then(() => {
        logger.info('User account created!');
        res.json({
            message: 'Account created!'
        });
    }).catch((e) => {
        console.log(e);
        logger.error('Failed to create user account!');
        logger.error(e);
        res.status(500).json({
            message: 'Unknown error creating account'
        });
    });
});

app.post('/login/', async (req, res) => {
    const username: string = req.body.username;
    const password: string = req.body.password;

    logger.debug('User attempting login');

    validateUserLogin(username, password).then(async (id) => {
        logger.debug('Login validated');

        const allowed = await canUserLogin(id);

        if (allowed) {
            generateSession(id).then((token) => {
                const [ identity,,expires ] = token;
                logger.debug('User session generated');
                res.status(200)
                    .cookie('user-session', identity, { httpOnly: true, expires: expires })
                    .json({message: 'Login successful!'});
            }).catch((e) => {
                logger.warn('Failed to generate user session!');
                console.warn(e);
                res.status(500).json({
                    message: 'Unable to generate session'
                });
            });
        } else {
            return res.status(401).json({ message: 'You are forbidden from logging in' });
        }
    }).catch((e) => {
        console.warn(e);
        logger.warn('Failed to authenticate user');

        if (e instanceof NoSuchUserError) {
            console.log('No such user exists!');
        } else if (e instanceof InvalidLoginCredentialsError) {
            console.log('User login is incorrect!!');
        }

        res.status(500).json({
            message: 'Unknown username or password'
        });
    });

});

app.get('/is-logged-in/', RestrictedAccessMiddlewear, async (req, res) => {
    res.send('Hey baby!');
});

app.use(OptionalIdentificationMiddlewear);

app.get('/:username/', async (req, res) => {
    const username = assert(req.params.username);
    const userid = res.locals.userid;
    const tokenKey = res.locals.tokenkey;

    try {
        if (username == '@me') {
            if (isnull(userid)) return res.status(401).json({message: 'You are not logged in!'});
            const accessPermissions = await viewUserGrantsToUserInfo(userid, username);
            const query = { id: true, username: accessPermissions.username, createdOn: accessPermissions.createdOn, email: accessPermissions.email };
            const account = await dbcon.userAccount.findFirst({ where: { id: userid }, select: query });
            return res.status(200).json(account);
        } else {
            let permissions: UserInfoAccess = { username: true, createdOn: true, email: false, defaultApplicationId: false, tokenList: false, sessionList: false, membershipList: false };
            
            if (isnull(tokenKey) && !isnull(userid)) {
                // They need to identify via session then!
                permissions = await viewTokenGrantsToUserInfo(userid, username);
            } else if (!isnull(tokenKey)) {
                // Identify via token
                permissions = await viewTokenGrantsToUserInfo(tokenKey, username);
            }

            const query = { id: true, username: permissions.username, createdOn: permissions.createdOn, email: permissions.email };
            const account = await dbcon.userAccount.findFirst({ where: { username: username }, select: query });

            return res.status(200).json(account);
        }
    } catch (e) {
        return res.status(500).send('');
    }
});

// Export the app :D
export default app;