// Imports
import { Router } from 'express';
import { createUser, generateSession, validateUserLogin } from '../utils/identity';
import { OptionalIdentificationMiddlewear, RestrictedAccessMiddlewear } from '../middlewear/identitygate';
import { InvalidLoginCredentialsError, NoSuchUserError } from '../utils/errors';
import { PrismaClient } from '@prisma/client';
import { assert, isnull } from '../utils/general';
import { UserInfoAccess, UserInfoAccessDefaultGrant, canUserLogin, whatUserInfoCanTokenRead, whatUserInfoCanUserRead } from '../utils/permissions';

// Get database connection
const dbcon = new PrismaClient();

// Create our apps
const app = Router();

app.post('/signup/', async (req, res) => {
    const logger = res.locals.logger;
    logger.info('Received request to create account!');
    const username: string = req.body.username;
    const password: string = req.body.password;
    
    createUser(username, password, undefined).then(() => {
        logger.info('User account created!');
        res.json({ message: 'Account created!' });
    }).catch((e) => {
        logger.error('Failed to create user account!');
        logger.error(e);
        res.status(500).json({ message: 'Unknown error creating account' });
    });
});

app.post('/login/', async (req, res) => {
    const logger = res.locals.logger;
    const username: string = req.body.username;
    const password: string = req.body.password;

    logger.info('Request for username/password login received');
    validateUserLogin(username, password).then(async (id) => {
        logger.info('Credentials are valid');

        const allowed = await canUserLogin(id);

        if (allowed) {
            logger.info('Account is permitted to login');
            generateSession(id).then((token) => {
                const [ identity,,expires ] = token;
                logger.info('Account session generated');
                res.status(200)
                    .cookie('user-session', identity, { httpOnly: true, expires: expires })
                    .json({message: 'Login successful!'});
            }).catch((e) => {
                logger.warn('Failed to generate account session!');
                logger.warn(e);
                res.status(500).json({ message: 'Unable to generate session' });
            });
        } else {
            logger.warn('Account is restricted from logging in!');
            return res.status(401).json({ message: 'You are forbidden from logging in' });
        }
    }).catch((e) => {
        if (e instanceof NoSuchUserError) {
            logger.warn('Failed to authenticate - Account does not exist!');
        } else if (e instanceof InvalidLoginCredentialsError) {
            logger.warn('Failed to authenticate - Invalid credentials!');
        } else {
            logger.error('Failed to authenticate - Unknown error!');
            logger.error(e);
        }

        res.status(500).json({ message: 'Unknown username or password' });
    });

});

app.get('/is-logged-in/', RestrictedAccessMiddlewear, async (req, res) => {
    const logger = res.locals.logger;
    logger.info('Heartbeat!');
    res.send('Hey baby!');
});

app.use(OptionalIdentificationMiddlewear);

app.get('/:username/', async (req, res) => {
    const logger = res.locals.logger;
    const username = assert(req.params.username);
    const userid = res.locals.userid;
    const tokenKey = res.locals.tokenkey;

    let filter: { username?: string, id?: number } = { username: username };
    let permissions: UserInfoAccess = UserInfoAccessDefaultGrant;
            
    logger.info(`Attempting to fetch data on user "${username}"`);

    try {
        if (username == '@me') {
            // console.log('They want themselves');
            logger.info('Attempting to get ID for current account');
            if (isnull(userid)) {
                logger.warn('No identity currently logged in!');
                return res.status(401).json({message: 'You are not logged in!'});
            }
            filter = { id: userid };
        }

        try {
            logger.info('Attempting to fetch permissions');
            if (isnull(tokenKey) && !isnull(userid)) permissions = await whatUserInfoCanUserRead(userid, username);
            else if (!isnull(tokenKey)) permissions = await whatUserInfoCanTokenRead(tokenKey, username);
            else logger.warn('Unauthenticated!');
        } catch (e) { logger.warn('Failed to find any permission records!'); }

        // console.log('qprep', isnull(userid), isnull(tokenKey));

        const query = { 
            id: true, 
            username: permissions.username, 
            createdOn: permissions.createdOn, 
            email: permissions.email, 
            defaultApplicationId: permissions.defaultApplicationId
        };
        
        // console.log('Got them');

        logger.info('Searching for user account in database');
        const account = await dbcon.userAccount.findFirst({ where: filter, select: query });

        if (isnull(account)) {
            logger.warn('Unable to find any such user!');
            return res.status(404).json({ message: 'Unable to find user!', username: username });
        }
        logger.info('User found!');
        return res.status(200).json({ message: 'Found user', data: account });
    } catch (e) {
        logger.error(e);
        return res.status(500).send('');
    }
});

app.get('/:username/applications/', async (req, res) => {
    const logger = res.locals.logger;
    const actorId = res.locals.userid;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const actorToken = res.locals.tokenkey;
    const username = assert(req.params.username);
    const onlyShowOwnedApplications = req.query.owned;

    logger.info(`Request to get all application's belonging to "${username}"`);

    try {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const allowed = true; // @TODO actually do this
        let filter: { id?: number, username?: string, isOwner?: boolean } = (onlyShowOwnedApplications) ? { username: username, isOwner: true } : { username: username };

        if (username == '@me') {
            if (isnull(actorId)) return res.status(401).json({message: 'You are not logged in!'});
            filter = (onlyShowOwnedApplications) ? { id: actorId, isOwner: true } : { id: actorId };
        }

        try {
            // if (isnull(actorToken) && !isnull(actorId)) permissions = await whatUserInfoCanUserRead(actorId, username);
            // else if (!isnull(actorToken)) permissions = await whatUserInfoCanTokenRead(actorToken, username);
            // else console.warn('Unauthenticated!');
        } catch (e) { logger.error('Failed to find permission records!'); }

        logger.info('Searching for applications in database');
        const applications = await dbcon.application.findMany({ 
            where: { Memberships: { some: { Account: filter } }},
            select: { id: true, displayName: true, description: true, icon_uri: true, isPublic: true }
        });
        logger.info('Applications fetched successfully');
        return res.status(200).json(applications);
    } catch(e) {
        logger.error(e);
        return res.json(500).json({ message: 'I messed up daddy' });
    }
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.get('/:username/currencies/', async (req, res) => {
    const logger = res.locals.logger;
    const actorId = res.locals.userid;
    // const actorToken = res.locals.tokenkey;
    const username = req.params.username;

    logger.info(`Received request to list currencies belonging to user "${username}"`);

    try {
        const filter = (req.params.username == '@me')
            ? { isOwner: true, accountId: actorId }
            : { isOwner: true, Account: { username: username } };

        logger.info('Fetching currency list from database');
        const list = await dbcon.currency.findMany({
            where: { Owner: { Memberships: { some: filter }} },
            select: {
                id: true,
                ownerId : true,
                public : true,
                currencySign : true,
                groupingSize : true,
                decimalCount : true,
                shortName : true,
                longName : true,
                liquidity : true,
                volume : true
            }
        });

        logger.info('Currency list received successfully');
        res.status(200).json({ message: 'Fetched list of owned currencies!', data: list });
    } catch (e) {
        logger.error(e);
        return res.json(500).json({ message: 'I messed up daddy' });
    }
});

// Export the app :D
export default app;