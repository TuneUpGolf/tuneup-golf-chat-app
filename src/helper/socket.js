const fs = require("fs");
const { socket_constant } = require("@constants/index");
const socketController = require("@controller/socket.controller");
const logs = require("@root/src/helper/logs");
const socketUsers = {};
const logger = require("@utils/logger.utils");
const {
  chatReaction,
} = require("@controller/socket.controller");
const verifyJWT = require("../middleware/socket.auth.middlware");

/**
 * Handles the socket connections and events related to chat functionality.
 * 
 * @param {Object} socket - The socket connection object.
 */
module.exports = function (socket) {
  socket.use(verifyJWT);
  console.log("Socket connection established");

  /* socket connection establishing */
  socket.on(socket_constant.CONNECTION, (socket) => {
    logs.connectLog(socket.handshake.query.senderId);
    // Initialise the connection
    const { groupId, status } = socket.handshake.query;
    socketController.connection({ socket, socketUsers, groupId, status });

    // JOIN Specific Group Connection
    socket.on(socket_constant.JOIN, (data) => {
      socketController.join(data, socket);
    });

    // LEAVE Specific Group Connection
    socket.on(socket_constant.LEAVE_ROOM, async (data) => {
      await socketController.roomDisconnect(socket, socketUsers, data);
    });

    socket.on(socket_constant.CHAT_REACTION, (data) => {
      chatReaction(socket, data);
    });


    // Notify chat message to the socket users
    socket.on(
      socket_constant.CHAT_MESSAGE,
      async ({
        msg,
        senderId,
        metadata,
        type,
        groupId,
        userName,
        fileUrl,
        quoteMsgId,
        parentId,
        parentMessage,
      }) => {
        await socketController.chatMessage({
          socket,
          msg,
          senderId,
          metadata,
          type,
          groupId,
          socketUsers,
          userName,
          fileUrl,
          quoteMsgId,
          parentId,
          parentMessage,
        });
      }
    );

    // Notify user typing
    socket.on(socket_constant.TYPING, (data) => {
      socketController.notifyTypingAllGroup(
        {
          groupId: data.groupId,
          socket,
          data,
          socketUsers,
        },
        socket_constant.NOTIFY_TYPING_GLOBAL
      );
    });

    // Notify user stop typing
    socket.on(socket_constant.STOP_TYPING, (data) => {
      socketController.notifyTypingAllGroup(
        {
          groupId: data.groupId,
          socket,
          data,
          socketUsers,
        },
        socket_constant.NOTIFY_STOP_TYPING_GLOBAL
      );
    });

    // Socket disconnect emit
    socket.on(socket_constant.DISCONNECT, async (prevChatGrp) => {
      await socketController.disconnect(socket, socketUsers, prevChatGrp);
      await socketController.updateUserLastSeen(
        socket.handshake.query.senderId
      );
    });

    // Socket for video call request initiated (sender)

  });
};

