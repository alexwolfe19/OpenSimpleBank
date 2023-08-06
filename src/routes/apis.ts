// Imports
import { Router } from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import logger from '../logger';

// Imports - Routes
import accounts_route from './accounts';
import wallets_route from './wallets';
import transaction_route from './transactions';
import currency_route from './currency';
import oauth2_route from './oauth2';

// Create our apps
const api_route = Router();

// Attach middlewear
api_route.use(bodyParser.json());
api_route.use(bodyParser.urlencoded({ extended: false }));
api_route.use(cookieParser());

// Log all traffic through the API
api_route.use((req, res, next) => {
    logger.info('API request received!', req.url);
    next();
});

// Attach the routes
api_route.use('/account', accounts_route);
api_route.use('/wallet/', wallets_route);
api_route.use('/transaction/', transaction_route);
api_route.use('/currency/', currency_route);
api_route.use('/oauth2/', oauth2_route);

export default api_route;