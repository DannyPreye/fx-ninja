import winston from 'winston';

const logger = winston.createLogger({
    level: 'info', // Set the minimum log level
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }), // Log stack traces for errors
        winston.format.splat(),
        winston.format.json()
    ),
    defaultMeta: { service: 'your-app-name' }, // Add service name to logs
    transports: [
        // Log to the console (for development)
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            ),
        }),
        // Log to a file (for production)
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' }),
    ],
});

export default logger;
