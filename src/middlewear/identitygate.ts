// Imports
import { Router } from 'express';
import { validateSession } from '../utils/identity';
import { isnull } from '../utils/general';

// Create our apps
const SessionMiddlewear = Router();
const OptionalIdentificationMiddlewear = Router();
const RestrictedAccessMiddlewear = Router();


SessionMiddlewear.use(async (req, res, next) => {
    console.log('Looking for user session...');
    const session = req.cookies['user-session'];
    if (isnull(session)) return next();
    console.log('User session found!');
    res.locals.sessionkey = session;
    next();
});

OptionalIdentificationMiddlewear.use(SessionMiddlewear);

OptionalIdentificationMiddlewear.use(async (req, res, next) => {

    // Step 1. Get our token
    // const usersession_cookie = req.cookies['user-session'];

    const token = req.cookies['user-session'];
    if (token == null || token == undefined) {
        next();
    } else {
        res.locals.user_token = token;
        console.log(token);
        try {
            const result = await validateSession(token);
            console.log(`Token is ${(result.valid) ? '' : 'not'} valid!`, token);

            console.table(result.session);

            if (result.valid) res.locals.userid = result.session!.userId;
            return next();
        } catch(e) {
            next();
        }
    }
});

RestrictedAccessMiddlewear.use(OptionalIdentificationMiddlewear);

RestrictedAccessMiddlewear.use(async (req, res, next) => {
    console.log('===[StrongIdentityGate]===');
    if (isnull(res.locals.sessionkey)) return res.status(401).send('');
    console.log('(SIG PASSED)');
    return next();
});

// Export the app :D
export { OptionalIdentificationMiddlewear, RestrictedAccessMiddlewear };