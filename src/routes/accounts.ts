// Imports
import { Router } from 'express';
import { TokenData, createUser, generateToken, validateUserLogin } from '../utils/identity';
import { OptionalIdentificationMiddlewear, RestrictedAccessMiddlewear } from '../middlewear/identitygate';
import { InvalidLoginCredentialsError, InvalidPasswordError, InvalidUsernameError, NoSuchUserError } from '../utils/errors';
import { Prisma, PrismaClient } from '@prisma/client';
import { assert, isnull } from '../utils/general';
import { canUserLogin } from '../utils/permissions';
import winston from 'winston';

// Get database connection
const dbcon = new PrismaClient();

// Create our apps
const app = Router();

app.post('/signup/', async (req, res) => {
    const logger: winston.Logger = res.locals.logger;
    logger.info('Processing user signup request.');
    const username: string | undefined = req.body.username;
    const password: string | undefined = req.body.password;

    if (username == undefined || password == undefined) {
        logger.warn("Username or password not provided!");
        return res.status(401).json({ message: 'Missing username or password!' });
    }
    
    createUser(username, password, undefined).then(() => {
        logger.info('Account creation successful');
        res.status(200).json({ message: 'Account created!' });
    }).catch((e) => {
        logger.error("Account creation failed!");
        if (e instanceof InvalidUsernameError)
            logger.error("REASON: Invalid username supplied.");
        if (e instanceof InvalidPasswordError)
            logger.error("REASON: Invalid password supplied.");
        if (e instanceof Prisma.PrismaClientKnownRequestError)
            logger.error(`REASON: Prisma query failed with code ${e.code}, message "${e.message}", meta: (${e.meta})`);
        logger.error(e);
        res.status(500).json({ message: 'Failed to create account!' });
    });
});

app.post('/login/', async (req, res) => {
    const logger = res.locals.logger;
    const username: string | undefined = req.body.username;
    const password: string | undefined = req.body.password;

    logger.info('Processing user login request');

    if (username == undefined || password == undefined) {
        logger.warn("No username or password supplied!");
        return res.status(401).json({ message: 'Missing username or password!' });
    }

    validateUserLogin(username, password).then(async (id) => {
        logger.info('Validated credentials.');

        const allowed = await canUserLogin(id);

        if (allowed) {
            logger.info('Account is permitted to login.');

            const useracct = await dbcon.userAccount.findFirst({where:{id:id}});
            const defaultorg: string | undefined = useracct?.defaultApplicationId ?? undefined; // If it returns null, freaking JS being cringe

            generateToken(id, defaultorg).then((token) => {
                const tokenData = token;
                const tokenString = Buffer.from(JSON.stringify(tokenData), 'utf-8').toString('base64');

                logger.info('Account login successful.');
                res.status(200)
                    .cookie('token', tokenString, { httpOnly: true, expires: tokenData.expiresOn })
                    .json({message: 'Login successful!'});
            }).catch((e) => {
                logger.warn('Account login failed!');
                logger.error(e);
                res.status(500).json({ message: 'Unable to generate token' });
            });
        } else {
            logger.warn('Account is restricted from logging in.');
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
    res.send('');
});

app.use(OptionalIdentificationMiddlewear);

app.get('/:username/applications/', async (req, res) => {
    const logger: winston.Logger = res.locals.logger;
    let tokend: TokenData = res.locals.tokenData;
    const username: string | undefined = req.params.username;
    const onlyShowOwnedApplications = req.query.owned;

    if (username == undefined)  // If this fails I have no fucking clue whats going on...
        return res.status(400).json({ message: 'Missing required setting' });
    logger.info(`Processing query for listing all applications for (${username})`);

    try {
        let filter: { 
            id?: string, 
            username?: string, 
            isOwner?: boolean 
        } = (onlyShowOwnedApplications) 
            ? { username: username, isOwner: true } 
            : { username: username };

        if (username == '@me') {
            if (isnull(tokend)) return res.status(401).json({message: 'Not authenticated.'});
            filter = (onlyShowOwnedApplications) 
                ? { id: tokend.userId, isOwner: true } 
                : { id: tokend.userId };
        }

        const applications = await dbcon.application.findMany({ 
            where: { Memberships: { some: { Account: filter } }},
            select: { id: true, displayName: true, description: true, icon_uri: true, isPublic: true }
        });

        logger.info('Successfully processed request!');
        return res.status(200).json(applications);
    } catch(e) {
        logger.error('Query failed to process.');
        logger.error(e);
        return res.json(500).json({ message: 'Failed to process query.' });
    }
});

app.get('/:username/currencies/', async (req, res) => {
    const logger: winston.Logger = res.locals.logger;
    const username: string | unknown = req.params.username;
    const tokend: TokenData = res.locals.tokenData;

    if (username == undefined)
        return res.status(400).json({});

    logger.info(`Received request to list currencies belonging to user "${username}"`);

    if (isnull(tokend) && req.params.username == '@me')
        return res.status(401).json({message: 'Not authenticated'});

    try {
        const filter = (req.params.username == '@me')
            ? { isOwner: true, accountId: tokend.userId }
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
        return res.status(200).json({ message: 'Fetched list of owned currencies!', data: list });
    } catch (e) {
        logger.error(e);
        return res.json(500).json({});
    }
});

// Export the app :D
export default app;