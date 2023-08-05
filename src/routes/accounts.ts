// Imports
import { Router } from 'express';
import logger from '../logger';
import { createUser, validateUserLogin, generateUserSession, NoSuchUserError, InvalidLoginCredentialsError } from '../utils/identity';
import { RestrictedAccessMiddlewear } from '../middlewear/identitygate';

// Create our apps
const app = Router();

app.post('/create/', async (req, res) => {
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

    validateUserLogin(username, password).then((id) => {
        logger.debug('Login validated');
        generateUserSession(id).then((token) => {
            logger.debug('User session generated');
            res.status(200)
                .cookie('user-session', token.identity, { httpOnly: true, expires: token.expires })
                .json({message: 'Login successful!'});
        }).catch((e) => {
            logger.warn('Failed to generate user session!');
            console.warn(e);
            res.status(500).json({
                message: 'Unable to generate session'
            });
        });
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

// Export the app :D
export default app;