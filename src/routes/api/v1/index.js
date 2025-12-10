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

      // Get socket controller's users object
      const socketController = require("@controller/socket.controller");

      // You need to export users from socket.controller.js or access it differently
      // For now, let's notify other users via socket
      const usersCircle = await findOtherUserIds(userId);

      // Get the global socket instance
      const { globalSocket } = require("@root/config/socket.config"); // Adjust path

      usersCircle.forEach((room) => {
        globalSocket.to(room).emit(socket_constant.NOTIFY_ONLINE_USER, {
          users: socketUsers,
        });
      });

      res.json({ success: true, message: `User ${userId} forced offline` });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  return router;
};
