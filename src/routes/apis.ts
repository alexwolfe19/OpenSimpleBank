// Imports
import { Router } from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
// import logger from '../logger';
import winston from 'winston';

// Imports - Routes
import accounts_route from './accounts';
import wallets_route from './wallets';
import transaction_route from './transactions';
import currency_route from './currency';
import oauth2_route from './oauth2';
import application_route from './applications';
import { OptionalIdentificationMiddlewear } from '../middlewear/identitygate';
import { v4 as uuidv4 } from 'uuid';

// Poop
const log_file_transport = new winston.transports.File({ filename: 'api.log', format: winston.format.simple() });
const console_transport = new winston.transports.Console({ format: winston.format.cli() });

const api_log = winston.createLogger({
    transports: [ log_file_transport, console_transport ]
});

// Create our apps
const api_route = Router();

// Heartbeat
api_route.get('/heartbeat', (req, res) => {
    return res.status(200).send('pulse');
});

// Attach middlewear
api_route.use(bodyParser.json());
api_route.use(bodyParser.urlencoded({ extended: false }));
api_route.use(cookieParser());

// Log all traffic through the API
api_route.use((req, res, next) => {

    const slog = api_log.child({ requestId: uuidv4() });

    res.locals.logger = slog;

    slog.info(`API Request received for "${req.url}"!`);
    
    next();
});

// Validate their identity
api_route.use(OptionalIdentificationMiddlewear);

// Attach the routes
api_route.use('/account/', accounts_route);
api_route.use('/wallet/', wallets_route);
api_route.use('/transaction/', transaction_route);
api_route.use('/currency/', currency_route);
api_route.use('/oauth2/', oauth2_route);
api_route.use('/application/', application_route);

export default api_route;