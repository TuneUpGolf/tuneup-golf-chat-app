const redis = require('redis');
const { config } = require('@config/index');
const logger = require("./../src/utils/logger.utils");

const redisClient = redis.createClient({
    url: `redis://${config.redisHost}:${config.redisPort}`,
    password: config.redisPassword,
});

redisClient.on('error', (err) => {
    logger.error('Redis error:', err);
});

redisClient.on('connect', () => {
    logger.info('Connected to Redis');
});

(async () => {
    await redisClient.connect();
})();

module.exports = {
    redisClient,
};
