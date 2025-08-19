const mongoose = require("mongoose");
mongoose.Promise = require("bluebird");
const { config } = require("@config/index");
const { logger } = require("@utils/index")

let conString = config.development_databaseURL;
if (config.environment === "PRODUCTION") {
  conString = config.databaseURL;
}
mongoose.set("strictQuery", false);
mongoose
  .connect(conString, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    logger.info(`Connected to MongoDB`);
  })
  .catch((e) => {
    logger.info(`Could not init db\n${e.trace}`);
  });

module.exports = {
  User: mongoose.models.User || require("@models/user.model")(mongoose),
  Group: mongoose.models.Group || require("@models/group.model")(mongoose),
  Chat: mongoose.models.Chat || require("@models/chat.model")(mongoose),
};
