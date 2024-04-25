// Imports
import { Router } from 'express';
import { isnull } from '../utils/general';
import { TokenData, validateToken } from '../utils/identity';

// Create our apps
const SessionMiddlewear = Router();
const OptionalIdentificationMiddlewear = Router();
const RestrictedAccessMiddlewear = Router();

OptionalIdentificationMiddlewear.use(async (req, res, next) => {
    const logger = res.locals.logger;


    logger.info('Checking for authentication');
    // Step 1. Get our token
    const token = req.cookies['token'];

    // Check the token
    if (token == null || token == undefined) {
        logger.info('No identity provided!');
        next();
    } else {
        logger.info('Found identity token!');
        const _tbuff = Buffer.from(token, 'base64').toString('utf-8');
        const tokenBody: TokenData = JSON.parse(_tbuff);
        // console.log(token);
        try {
            const isTokenValid = await validateToken(tokenBody.publicKey, tokenBody.privateKey!);
            logger.info(`The token is ${(isTokenValid) ? '' : 'not'} valid`);
            if (isTokenValid) {
                res.locals.token = token;
                res.locals.userid = tokenBody.userId;
                res.locals.applicationid = tokenBody.applicationId;
                res.locals.tokenData = tokenBody;
            }
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
    if (isnull(res.locals.token)) {
        logger.warn('Failed to validate identity, rejecting traffic!');
        return res.status(401).send('');
    }
    // console.log('(SIG PASSED)');
    return next();
});

// Export the app :D
export { OptionalIdentificationMiddlewear, RestrictedAccessMiddlewear };