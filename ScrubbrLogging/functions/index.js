const { onRequest } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");

exports.scrubbrLogger = onRequest((request, response) => {
    const logData = request.body;
    const { level, timestamp, source, message, userId, additionalData } = logData;

    // Basic log structure
    const logMessage = {
        timestamp: timestamp || new Date().toISOString(),
        source: source || 'UnknownSource',
        message: message || 'No message provided',
        userId: userId || 'Anonymous',
        additionalData: additionalData || {}
    };

    // Log based on the level provided in the request
    switch (level) {
        case 'INFO':
            logger.info(logMessage);
            break;
        case 'DEBUG':
            logger.debug(logMessage);
            break;
        case 'ERROR':
            logger.error(logMessage);
            break;
        case 'WARN':
            logger.warn(logMessage);
            break;
        default:
            // Log as INFO if level is not recognized
            logger.info({ ...logMessage, level: 'INFO (default)' });
    }

    response.sendStatus(200);
});
