// Imports
import { Router } from 'express';
import { validateUserSession } from '../utils/identity';

// Create our apps
const OptionalIdentificationMiddlewear = Router();
const RestrictedAccessMiddlewear = Router();

OptionalIdentificationMiddlewear.use(async (req, res, next) => {
    const token = req.cookies['user-session'];
    if (token == null || token == undefined) {
        next();
    } else {
        res.locals.user_token = token;
        console.log(token);
        try {
            const result = await validateUserSession(token);
            if (result.valid) res.locals.userid = result.userid;
            next();
        } catch(e) {
            next();
        }
    }
});

RestrictedAccessMiddlewear.use(async (req, res, next) => {
    const token = req.cookies['user-session'];
    if (token == null || token == undefined) res.status(401).send('');
    else {
        res.locals.user_token = token;
        console.log(token);
        try {
            const result = await validateUserSession(token);
            if (result.valid) {
                res.locals.userid = result.userid;
                next();
            }
            else res.status(401).send('');
        } catch(e) {
            res.status(401).send('');
        }
    }
});

// Export the app :D
export { OptionalIdentificationMiddlewear, RestrictedAccessMiddlewear };