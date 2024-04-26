// Imports
import winston from 'winston';

// Define the logger
const combined_file_transport = new winston.transports.File({ filename: 'combined.log', format: winston.format.simple() });
const api_file_transport = new winston.transports.File({ filename: 'api.log', format: winston.format.simple() });
const console_transport = new winston.transports.Console({ format: winston.format.cli() });
const http_file_transport = new winston.transports.File({ filename: 'http.log', format: winston.format.simple() });

const myWinstonOptions = {
    transports: [console_transport]
};

const api_log = winston.createLogger({
    transports: [ api_file_transport, console_transport ]
});

const live_log = winston.createLogger({
    transports: [console_transport, combined_file_transport]
});

const http_log = winston.createLogger({
    transports: [console_transport, http_file_transport, combined_file_transport]
});

export default live_log;
export { api_log, live_log, http_log };