// Imports
import { Router } from 'express';
// import logger from '../logger';
import { OptionalIdentificationMiddlewear } from '../middlewear/identitygate';
import { PrismaClient } from '@prisma/client';
import { assert } from '../utils/general';
import { generateToken, validateUserLogin } from '../utils/identity';
import { InvalidLoginCredentialsError, NoSuchUserError } from '../utils/errors';

// Get database connection
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const dbcon = new PrismaClient();

// Create our apps
const token_route = Router();

token_route.use(OptionalIdentificationMiddlewear);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
token_route.post('/token', async (req, res) => {
    const params = req.params as {
        client_id?: string
        response_type?: string,
        scope?: string,
        username?: string,
        password?: string,
        client_secret?: string,
    };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const client_id = assert(params.client_id);  
    const response_type = assert(params.response_type); 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const scope = assert(params.scope)!.split(',');

    if (response_type == 'code') {
        return res.status(501).json({message: 'Not implemented!'});
    } else if (response_type == 'device') {
        return res.status(501).json({message: 'Not implemented!'});
    } else if (response_type =='client_credentials') {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const client_secret = assert(params.client_secret)!;

    } else if (response_type == 'password') {
        const username = assert(params.username)!;
        const password = assert(params.password)!;
        try {
            const userid = await validateUserLogin(username, password);
            const token = await generateToken(userid);
            return res.json({ message: 'Token successfully generated!', token: token });
        } catch(e) {
            if (e instanceof InvalidLoginCredentialsError || e instanceof NoSuchUserError) {
                res.status(500).json({
                    message: 'Unknown username or password'
                });
            }
        }
    }
});


// Export the app :D
export default token_route;