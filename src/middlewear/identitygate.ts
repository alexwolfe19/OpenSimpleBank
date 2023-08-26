// Imports
import { Router } from 'express';
import { validateSession } from '../utils/identity';
import { isnull } from '../utils/general';

// Create our apps
const SessionMiddlewear = Router();
const OptionalIdentificationMiddlewear = Router();
const RestrictedAccessMiddlewear = Router();


SessionMiddlewear.use(async (req, res, next) => {
    const logger = res.locals.logger;
    logger.info('Checking for user session');
    const session = req.cookies['user-session'];
    if (isnull(session)) return next();
    logger.info('Session found!');
    res.locals.sessionkey = session;
    next();
});

OptionalIdentificationMiddlewear.use(SessionMiddlewear);

OptionalIdentificationMiddlewear.use(async (req, res, next) => {
    const logger = res.locals.logger;

    // Step 1. Get our token
    // const usersession_cookie = req.cookies['user-session'];

    logger.info('Checking for authentication');

    const token = req.cookies['user-session'];
    if (token == null || token == undefined) {
        logger.info('No identity provided!');
        next();
    } else {
        logger.info('Found identity token!');
        res.locals.user_token = token;
        // console.log(token);
        try {
            const result = await validateSession(token);
            logger.info(`The token is ${(result.valid) ? '' : 'not'} valid`);
            if (result.valid) {res.locals.userid = result.session!.userId;}
            return next();
        } catch(e) {
            logger.info('Error validating identity!');
            next();
        }
    }
});

RestrictedAccessMiddlewear.use(OptionalIdentificationMiddlewear);

RestrictedAccessMiddlewear.use(async (req, res, next) => {
    const logger = res.locals.logger;
    logger.info('Passing through *mandatory* authentication');
    if (isnull(res.locals.sessionkey)) {
        logger.warn('Failed to validate identity, rejecting traffic!');
        return res.status(401).send('');
    }
    // console.log('(SIG PASSED)');
    return next();
});

// Export the app :D
export { OptionalIdentificationMiddlewear, RestrictedAccessMiddlewear };