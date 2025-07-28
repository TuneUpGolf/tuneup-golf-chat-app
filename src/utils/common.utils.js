const { rateLimit } = require('express-rate-limit')
const { config } = require('@config/common.config')
const { redisClient } = require('@config/redis.config');
const cheerio = require('cheerio');
const getNextSequenceValue = async (sequenceName, Counter) => {
  const sequenceDocument = await Counter.findOneAndUpdate(
    { id: sequenceName },
    { $inc: { sequence_value: 1 } },
    { new: true, upsert: true }
  );

  return sequenceDocument.sequence_value;
};

const sanitize = (string) => {
  const $ = cheerio.load(string);
  return $.text();
};

const getAllOnlineUsers = () => {
  return redisClient.sMembers('allOnlineUsers');
}




module.exports = { getNextSequenceValue, sanitize, getAllOnlineUsers };