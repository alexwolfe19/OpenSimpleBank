// Imports
import winston from 'winston';

// Define the logger
const consoleTransport = new winston.transports.Console();
const myWinstonOptions = {
    transports: [consoleTransport]
};


const logger = winston.createLogger(myWinstonOptions);
export default logger;