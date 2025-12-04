const express = require("express");
const router = express.Router();
module.exports = () => {
  router.use("/user", require("@routes/api/v1/user.route")(router));
  router.use("/group", require("@routes/api/v1/groups.route")(router));
  router.use("/chat", require("@routes/api/v1/chat.route")(router));
  // Add this endpoint
  router.post("/force-user-offline", async (req, res) => {
    try {
      const { userId } = req.body;

      // Remove from all tracking
      delete socketUsers[userId];
      await redisClient.sRem("allOnlineUsers", userId);

      // Also clean up any room associations
      // ... your cleanup logic here

      res.json({ success: true, message: `User ${userId} forced offline` });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  return router;
};
