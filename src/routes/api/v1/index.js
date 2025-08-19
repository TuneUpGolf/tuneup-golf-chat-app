const express = require("express");
const router = express.Router();
module.exports = () => {
  router.use("/user", require("@routes/api/v1/user.route")(router))
  router.use("/group", require("@routes/api/v1/groups.route")(router))
  router.use("/chat", require("@routes/api/v1/chat.route")(router))
  return router;
};
