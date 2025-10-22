const path = require("path");
const moment = require("moment");
const mongoose = require("mongoose");
const logs = require("@root/src/helper/logs");
const { socket_constant, user_constants } = require("@constants/index");
const {
  chatUpdate,
  getChatMesages,
  addChatReaction,
  removeChatReaction,
} = require("@services/chat.services");
// Import leo-profanity
const leoProfanity = require("leo-profanity");
const {
  groupFind,
  groupChatMessageUpdateFind,
  findOtherUserIds,
} = require("@services/group.services");
const {
  userFind,
  updateUserDetailOnUserId,
  changeUserStatus,
} = require("@services/user.services");
const { Group } = require("@models/index");
const { Chat, User } = require("@models/index");
const users = {};
const logger = require("@utils/logger.utils");
const { sanitize } = require("@utils/common.utils");
const { getAllOnlineAdmins } = require("@utils/common.utils");
const { redisClient } = require("@root/config/redis.config");
const { s3 } = require("../services/digitalOceanService");

/**
 * Manages the connection of a socket to the server.
 *
 * @param {Object} socket - The socket connection object.
 * @param {Object} socketUsers - An object containing information about connected socket users.
 * @param {string} groupId - The ID of the group associated with the connection.
 * @param {Object} res - The response object used for handling responses.
 * @returns {Promise<void>} - A promise indicating the completion of the connection process.
 */
exports.connection = async ({ socket, socketUsers }) => {
  try {
    //status will come as true for newly connectiion
    socket.join(socket.handshake.query.senderId);
    socketUsers[socket.handshake.query.senderId] = true;
    console.log(
      socket.handshake.query.senderId,
      /ALL SOKCET USERS/,
      socketUsers
    );

    //usersIds will contails all the related users id which is having the onetoone group with the current user
    const usersIds = await findOtherUserIds(socket.handshake.query.senderId);

    usersIds.forEach((room) => {
      //send emit to all that users about online status
      global.globalSocket.to(room).emit(socket_constant.NOTIFY_ONLINE_USER, {
        users: socketUsers,
        // updatedUser
      });
    });
  } catch (error) {
    socket.emit(socket_constant.SOMETHING_WENT_WRONG, error);
  }
};

// Helper function to store user ID in the 'users' object
const storeUserId = (data, groupId) => {
  if (data.senderId) {
    users[data.senderId + "_" + groupId] = groupId;
  } else {
    users[groupId] = groupId;
  }
};

// Helper function to save chat group information to the database
const saveChatGroupToDatabase = async (groupId, data, socket) => {
  try {
    const grpObj = await groupFind({ _id: groupId });
    const array = grpObj
      ? Object.keys(JSON.parse(JSON.stringify(grpObj.removedUsers)))
      : 0;

    let index = 1;
    if (data.type === user_constants.ONETOONE) {
      const grupMembers = grpObj.groupMembers;
      const firstMemberData = await userFind({ userId: grupMembers[0] });
      const secondMemberData = await userFind({ userId: grupMembers[1] });
      if (!(firstMemberData && secondMemberData)) {
        index = 0;
      }
    }

    let isRemoved = false;
    if (array.length > 0) {
      isRemoved = array.includes(data.senderId.toString());
      if (isRemoved === false) socket.join(groupId);
    } else {
      socket.join(groupId);
    }

    return index;
  } catch (error) {
    // Handle the error here, you can log it or throw a new error if needed
    logger.error("An error occurred in saveChatGroupToDatabase:", error);
    throw error; // You can choose to rethrow the error if you want it to propagate further
  }
};

/**
 * Handles the leave event for a user in a socket group.
 * @param {Object} data - The data object containing necessary details.
 * @param {string} data.groupId - The ID of the group the user is leaving.
 * @param {string} data.senderId - The ID of the user who is leaving the group.
 * @param {Object} socket - The socket instance for the user.
 * @returns {Promise<void>} - A promise that resolves when the user successfully leaves the group.
 * Logs the action and handles any errors that may occur during the process.
 */
exports.roomDisconnect = async (socket, socketUsers, data) => {
  try {
    await socket.leave(data.groupId);
    logs.roomLeft(data.groupId, data.senderId);
    if (data.senderId) {
      // Remove the user from the 'users' object using the senderId and groupName as the key
      delete users[data.senderId + "_" + data.groupId];
    } else {
      // Remove the group from the 'users' object using the groupName as the key
      delete users[data.groupId];
    }

    // Remove the saved socket from the 'users' object
    delete users[data.senderId + "_" + data.groupId];
  } catch (error) {
    logger.error(`[Room Disconnect socket] [Error] => ${error}`);
  }
};

// Main function
exports.join = async (data, socket) => {
  try {
    const { groupId } = data;

    storeUserId(data, groupId);

    const clientInfo = {
      ...data,
      IPAddress: socket.request.connection.remoteAddress,
    };
    const index = await saveChatGroupToDatabase(groupId, clientInfo, socket);

    if (index === 1) {
      if (data.senderId % 1 === 0) {
        data.senderId = data.senderId.toString();
      }

      await chatUpdate({ groupId, senderId: data.senderId });
    }
  } catch (error) {
    socket.emit(socket_constant.SOMETHING_WENT_WRONG, error);
  }
};

/**
 * Handles the sending of chat messages.
 *
 * @param {Object} params - Parameters for sending the chat message.
 * @param {Object} params.socket - The socket connection object.
 * @param {string} params.msg - The message content.
 * @param {string} params.senderId - The ID of the message sender.
 * @param {string} params.type - The type of message ('group' or 'onetoone').
 * @param {string} params.groupId - The ID of the group associated with the message.
 * @param {string} params.userName - The name of the message sender.
 * @param {string} params.fileUrl - The URL of any file attached to the message.
 */
exports.chatMessage = ({
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
}) => {
  try {
    console.log(/gr/, groupId);

    // Find the group based on its name and sort it by createdAt in descending order
    Group.findById(groupId)
      .sort({ createdAt: -1 })
      .then(async (groups) => {
        console.log(/gr/, groups);

        // Get a list of online users in the group, including the sender
        const onlineUsers = getOnlineUsers(groupId, senderId);
        onlineUsers.push(senderId);
        // Update the 'updatedAt' timestamp for the group
        //Update the group's last activity time.
        groups.updatedAt = moment.utc(new Date());
        groups.save();

        if (msg !== "") {
          console.log("Checking Abusive Words:", msg);

          // Check for profanity
          if (leoProfanity.check(msg)) {
            socket.emit(socket_constant.WARNING, {
              message: "Warning: Please avoid using abusive words!",
              msg,
            });
            console.log("IS BAD WORd");
            return;
          }

          const readUserIds = onlineUsers.filter((ids) =>
            groups.groupMembers.includes(ids)
          );
          // Create a 'messageData' object with various message details
          //Build a message object with all required metadata.
          const messageData = {
            groupId: groups._id,
            message: msg,
            groupName: groups.groupName,
            senderId,
            type,
            readUserIds,
            userName,
            fileUrl,
            isFile: false,
            sendTo: groups.groupMembers,
            parentId: null,
            metadata,
          };
          //If the message is a reply (has parentId), include it.
          if (parentId && mongoose.Types.ObjectId.isValid(parentId)) {
            messageData.parentId = mongoose.Types.ObjectId(parentId);
          }
          console.log(/messageData/, messageData);

          // Save Message + Update State
          // Create a new chat message using 'messageData'
          const chatMessage = new Chat(messageData);

          // Add additional fields to 'messageData'
          messageData.createdAt = groups.updatedAt;
          messageData.emailNotified = chatMessage.emailNotified;
          messageData.isBroadcast = chatMessage.isBroadcast;
          messageData.isEmailMessage = chatMessage.isEmailMessage;
          messageData.updatedAt = groups.updatedAt;
          messageData.__v = groups.__v;
          messageData._id = chatMessage._id;

          groups.groupMembers.forEach((userId) => {
            // onlineAdmins = onlineAdmins.filter(adminId => adminId !== userId);
          });
          //increase unreadCount for users if not read
          await setChatUnreadCount(groups.groupMembers, groupId, readUserIds);

          // Save the chat message and update the group's chat message data
          const chatMessageObj = await chatMessage.save();

          const offlineUserIds = groups.groupMembers.filter(
            (id) => !onlineUsers.includes(id)
          );

          console.log(offlineUserIds);

          for (const offlineUserId of offlineUserIds) {
            // Find sender and receiver in your User model
            const sender = await User.findOne({ _id: senderId }); // or however your model is structured
            const receiver = await User.findOne({ _id: offlineUserId });

            if (!sender || !receiver) {
              console.log("test 2");

              console.log(
                `User not found for sender: ${senderId} or receiver: ${offlineUserId}`
              );
              continue; // skip this iteration if either user is missing
            }
            console.log("test 1");

            // Send the notification with user.userId instead of _id
            await fetch("https://tuneup.golf/api/notify-message", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                tenant_id: groups.tenant_id,
                sender_id: sender.userId, // from user model
                receiver_id: receiver.userId, // from user model
                message: msg,
                group_id: groupId,
                type: type || "chat",
                sent_at: new Date().toISOString(),
              }),
            });
          }

          await groupChatMessageUpdateFind(groups._id, msg);

          // Broadcast the message to everyone in the group (except sender).
          // Emit the message back to sender (self-confirmation).
          messageData.parentMessage = parentMessage;
          chatMessageObj._doc.parentMessage = parentMessage;

          //Funtion for sending push notification
          // prepareAndSendPushNotification({ senderId, groups, readUserIds, type, msg, messageData });
          console.log(/RECEIVED EMIT/, groupId);
          socket.broadcast
            .in(groupId)
            .emit(socket_constant.RECEIVED, messageData);
          socket.emit(socket_constant.RECEIVED, chatMessageObj);
          // Notify unread messages to group members
          notifyUnreadAllGroup(groups, {
            senderId,
            socketUsers,
            onlineUsers,
            socket,
            msg,
            userName,
            type,
            messageData,
          });
          // Log the message in the message log
          logs.messageLog(groupId, senderId, msg);
        }
      });
  } catch (error) {
    socket.emit(socket_constant.SOMETHING_WENT_WRONG, error);
  }
};

/**
 * Updates the unread message count for each group member in Redis.
 * @param {Array<string>} groupMembers - The IDs of the group members.
 * @param {string} groupId - The ID of the group.
 * @param {Array<string>} readUserIds - The IDs of users who have read the message.
 * @returns {Promise<void>} - A promise that resolves when the counts have been updated.
 * @throws {Error} - If an error occurs during the Redis operations.
 */
async function setChatUnreadCount(groupMembers, groupId, readUserIds) {
  try {
    await Promise.all(
      groupMembers.map(async (id) => {
        const hashKey = `${id}:${groupId}`; // create hashKey
        if (readUserIds.includes(id)) {
          await redisClient.set(hashKey, 0); // if user read this message store unreadCount 0
        } else {
          await redisClient.incrBy(hashKey, 1); // if user has not read this message increase unreadCount by 1
        }
      })
    );
  } catch (error) {
    throw new Error(
      `Failed to update unread counts in Redis: ${error.message}`
    );
  }
}

exports.notifyTypingAllGroup = function (
  { groupId, socket, data, socketUsers },
  emitName
) {
  try {
    // Find the group based on its name and sort it by createdAt in descending order
    Group.findOne({ _id: groupId })
      .sort({ createdAt: -1 })
      .then(async (group) => {
        // If the group does not exist, return from the function
        if (!group) return;

        // Find the index of the senderId within the group's members
        const index = group.groupMembers.indexOf(data.senderId);
        console.log(/index/, index);

        // If the senderId is found in the group, remove it from the array
        if (index > -1) {
          group.groupMembers.splice(index, 1);
        }

        const message = {
          groupId: group._id,
          groupName: group.groupName,
          user: data.user,
          message: socket_constant.TYPING_MESSAGE,
          senderId: data.senderId,
          senderName: data.senderName,
          type: data.type,
        };
        console.log(/message/, message);

        // Iterate through each user in the group members
        group.groupMembers.forEach((userId) => {
          // Check if the user is connected to the socket
          if (Object.keys(socketUsers).includes(userId)) {
            // Emit the typing notification to the user
            socket.broadcast.in(userId).emit(emitName, message);
          }
        });
      });
  } catch (error) {
    socket.emit(socket_constant.SOMETHING_WENT_WRONG, error);
  }
};

const getOnlineUsers = (groupId, senderId) => {
  try {
    let onlineUsers = []; // Initialize an array to store online user keys
    const onlineUsersIds = []; // Initialize an array to store online user IDs

    // Check if the 'users' object contains the 'groupName'
    if (Object.values(users).includes(groupId)) {
      // Filter the keys of the 'users' object to find those with the matching 'groupName'
      onlineUsers = Object.keys(users).filter((k) => users[k] === groupId);

      // Find the index of the senderId in 'onlineUsers' and remove it
      const index = onlineUsers.indexOf(senderId);
      if (index > -1) {
        onlineUsers.splice(index, 1);
        // Log that the senderId is no longer online in the specific group
        logs.onlineUsersLog(groupId, senderId);
      }

      // Iterate through online user keys and extract user IDs
      onlineUsers.forEach((userId) => {
        const id = userId.split("_");
        if (senderId !== id[0]) {
          onlineUsersIds.push(id[0]);
        }
      });

      return onlineUsersIds; // Return the array of online user IDs
    }
    return onlineUsersIds; // If the 'groupName' is not found in 'users', return an empty array
  } catch (error) {
    socket.emit(socket_constant.SOMETHING_WENT_WRONG, error);
  }
  return null;
};

exports.updateUserLastSeen = async (userId) => {
  try {
    if (userId) {
      // Update the last seen timestamp for the user with the provided 'userId'
      await updateUserDetailOnUserId(userId, {
        last_seen: new Date(),
      });
    }
  } catch (error) {
    socket.emit(socket_constant.SOMETHING_WENT_WRONG, error);
  }
};

/**
 * Handles the upload process for a file attachment.
 *
 * @param {Object} socket - The socket connection object for emitting events.
 * @param {Object} data - Contains the file data, group ID, and filename.
 * @returns {Promise<void>} - A promise indicating the completion of the upload process.
 */
exports.handleUpload = async (socket, data) => {
  const updatedFileName = `${Date.now()}_${data.groupId}_${data.filename}`;
  const params = {
    // change this to according to project bucket name
    Bucket: "tuneupgolf-chat",
    Key: updatedFileName,
    Body: data.fileData,
    ACL: "public-read",
  };
  try {
    const s3Result = await s3.upload(params).promise();
    console.log(/s3Result/, s3Result);

    const publicUrl = s3Result.Location;
    socket.emit(socket_constant.UPLOAD_STATUS, {
      success: true,
      message: "Upload successful",
      publicUrl,
    });
    logger.info(`Aattachment Uploaded to => ${publicUrl}`);
    await notifyUpload(socket, data, updatedFileName);
  } catch (error) {
    console.log(/er/, error);

    logger.error(
      `[handleUpload] [Error] while uploading attachment to s3=> ${error}`
    );
    socket.emit(socket_constant.UPLOAD_STATUS, {
      success: false,
      message: "Upload failed",
    });
  }
};

function removeUserFromRoom(userId) {
  for (const key in users) {
    if (key.startsWith(userId + "_")) {
      delete users[key];
    }
  }
}

exports.disconnect = async (socket, socketUsers) => {
  try {
    const { senderId } = socket.handshake.query;
    removeUserFromRoom(senderId);

    await redisClient.sRem("allOnlineUsers", socket.handshake.query.senderId);
    const onlineUsers = await redisClient.sMembers("allOnlineUsers");
    if (socket.handshake.query.senderId) {
      await redisClient.sRem(
        user_constants.ALLONLINEADMIN,
        socket.handshake.query.senderId
      );
      const usersCircle = await findOtherUserIds(
        socket.handshake.query.senderId
      );
      usersCircle.forEach((room) => {
        socket.to(room).emit(socket_constant.ONLINE_USER_UPDATE, usersCircle); // Emit to rooms except the sender
      });
      // Remove the user from the 'users' object using the senderId and groupName as the key
      delete users[
        socket.handshake.query.senderId + "_" + socket.handshake.query.groupId
      ];
      const userData = [];
      // Iterate through 'users' object and extract user IDs
      Object.keys(users).forEach((key) => {
        const id = key.split("_");
        userData.push(id[0]);
      });

      // If the user is not found in 'userData', remove them from 'socketUsers'
      if (!userData.includes(socket.handshake.query.senderId)) {
        delete socketUsers[socket.handshake.query.senderId];
      }
    } else {
      // Remove the group from the 'users' object using the groupName as the key
      delete users[socket.handshake.query.groupId];
    }
    const updatedUser = await changeUserStatus(socket.handshake.query.senderId);
    // Remove the saved socket from the 'users' object
    delete users[
      socket.handshake.query.senderId + "_" + socket.handshake.query.groupId
    ];
    // Broadcast a notification to all connected clients about online users
    const usersCircle = await findOtherUserIds(socket.handshake.query.senderId);
    usersCircle.forEach((room) => {
      global.globalSocket.to(room).emit(socket_constant.NOTIFY_ONLINE_USER, {
        users: onlineUsers,
        updatedUser,
      });
    });

    // Log the disconnection of the user
    logs.disconnectLog(
      socket.handshake.query.groupId,
      socket.handshake.query.senderId
    );
  } catch (error) {
    logger.error(`[socket disconnect] [Error] => ${error}`);
  }
};

const notifyUnreadAllGroup = async (
  group,
  {
    senderId,
    socketUsers,
    onlineUsers,
    socket,
    msg,
    userName = "",
    type = "",
    isNewFile,
    messageData,
  }
) => {
  try {
    // Clone the 'groupMembers' array from the 'group' object
    const groupMembersArr = JSON.parse(JSON.stringify(group.groupMembers));
    // Find and remove the senderId from the 'groupMembersArr'
    const index = groupMembersArr.indexOf(senderId);
    if (index > -1) {
      groupMembersArr.splice(index, 1);
    }
    const onlineUsersWithAdmins = await getAllOnlineAdmins();
    groupMembersArr.forEach((userId) => {
      if (!onlineUsersWithAdmins.includes(userId))
        onlineUsersWithAdmins.push(userId);
    });
    console.log(socketUsers, onlineUsers, /SOCKET USERS/, /ONLINE USERS/);
    // Iterate through each user in 'groupMembersArr'
    onlineUsersWithAdmins.forEach(async (userId) => {
      // Check if the user is in the 'socketUsers' and is not online
      if (
        Object.keys(socketUsers).includes(userId) &&
        !onlineUsers.includes(userId)
      ) {
        console.log(/SENT UNREAD TO/, userId);
        // Retrieve unread message count and related data for the user and group
        const unreadData = await getUnreadCountByUser({
          userId,
          userName,
          type,
          senderId,
          groups: group,
        });

        // Retrieve the overall unread message count for the user and group
        const hashKey = `${userId}:${group._id.toString()}`; //create hashKey based on userId:groupId
        const unreadMessageCount = await redisClient.get(hashKey); // get unreadCount from redis
        const dbRes = [
          {
            _id: userId,
            count: unreadMessageCount || 0,
            message: msg,
            group_id: group._id,
            readUserIds: messageData?.readUserIds,
            createdAt: messageData?.createdAt,
          },
        ];
        const responseObj = {};

        responseObj["data"] = dbRes;
        // Emit a notification about the overall unread message count to the user
        notifyUnreadCountUser({
          socket,
          userId,
          unreadData,
          responseObj,
          isNewFile,
        });
      }
    });
  } catch (error) {
    socket.emit(socket_constant.SOMETHING_WENT_WRONG, error);
  }
};

const notifyUnreadCountUser = ({
  socket,
  userId,
  unreadData,
  responseObj,
  isNewFile,
}) => {
  if (isNewFile) {
    socket
      .to(userId.toString())
      .emit(socket_constant.NOTIFY_UNREAD_GLOBAL, unreadData);
  } else {
    socket.broadcast
      .in(userId)
      .emit(socket_constant.NOTIFY_UNREAD_GLOBAL, unreadData);
  }

  if (isNewFile) {
    socket
      .to(userId.toString())
      .emit(socket_constant.NOTIFY_UNREAD_GLOBAL, responseObj);
  } else {
    socket.broadcast
      .in(userId)
      .emit(socket_constant.NOTIFY_UNREAD_GLOBAL, responseObj);
  }
};

const getUnreadCountByUser = async ({
  userId,
  userName,
  type,
  senderId,
  groups,
  broadcast = false,
}) => {
  try {
    // Retrieve the group IDs in which the user is a member
    const groupIds = await Group.find({
      _id: groups._id,
      groupMembers: { $in: [userId] },
    }).distinct("groupName");

    let where = {};

    // Define the 'where' query criteria based on 'broadcast' flag
    if (broadcast) {
      where = {
        isDeleted: false,
        groupId: groupIds._id,
        readUserIds: { $nin: [userId] },
        sendTo: { $in: [userId] },
      };
    } else {
      where = {
        isDeleted: false,
        groupId: groupIds._id,
        readUserIds: { $nin: [userId] },
        senderId: { $nin: [userId] },
        sendTo: { $in: [userId] },
      };
    }

    // Execute an aggregate query on the 'chat' collection
    return await getChatMesages(where, userName, type, senderId);
  } catch (error) {
    socket.emit(socket_constant.SOMETHING_WENT_WRONG, error);
  }
  return null;
};

exports.chatReaction = async (socket, data) => {
  try {
    const { id, reaction, userId, userName, isAdd, reactionId, emojiId } = data;
    //create response Object
    const chatReactionResponse = {
      reaction,
      id, // messageId
      userId,
      userName,
      reactionId,
      emojiId,
    };
    console.log(/chatReactionResponse/, chatReactionResponse);

    if (isAdd) {
      // add new reaction to chat message
      const chat = await addChatReaction(data);
      // Get the newly added reaction's ID and update the response object
      const lastIndex = chat.reactions.length - 1;
      chatReactionResponse.reactionId = chat.reactions[lastIndex]._id;
      chatReactionResponse.groupId = chat.groupId;
    } else {
      // remove a reaction based on Id from message
      const val = await removeChatReaction(data);
      chatReactionResponse.groupId = val.groupId;
      // if reaction is not found emit an event with message
      if (!val) {
        socket.emit(socket_constant.CHAT_REACTION_REMOVE, {
          success: true,
          message: "reaction not found",
          chatReactionResponse,
        });
        return;
      }
    }
    // Emit socket event with appropriate message based on whether the reaction was added or removed
    socket.emit(
      isAdd
        ? socket_constant.CHAT_REACTION_RESULT
        : socket_constant.CHAT_REACTION_REMOVE,
      {
        success: true,
        message: isAdd ? "reacted to message" : "reaction removed successfully",
        chatReactionResponse,
      }
    );
    socket.broadcast
      .in(chatReactionResponse?.groupId?.toString())
      .emit(
        isAdd
          ? socket_constant.CHAT_REACTION_RESULT
          : socket_constant.CHAT_REACTION_REMOVE,
        {
          success: true,
          message: isAdd
            ? "reacted to message"
            : "reaction removed successfully",
          chatReactionResponse,
        }
      );
  } catch (error) {
    logger.error("SOCKET | CHAT_REACTION_FAILED | ERROR", error);
    // Handle other errors as needed
  }
};

/**
 * Notifies users in the group about the uploaded file.
 *
 * @param {Object} socket - The socket connection object for emitting events.
 * @param {Object} data - Contains information about the uploaded file, group, sender, etc.
 * @param {string} updatedFileName - The updated filename of the uploaded file.
 * @returns {Promise<void>} - A promise indicating the completion of the notification process.
 */
const notifyUpload = async (socket, data, updatedFileName) => {
  try {
    // Extract the filename from the provided 'data'
    const filename = updatedFileName;
    const { groupId } = data;
    // Find the group based on its name and sort it by createdAt in descending order
    await Group.findOne({ _id: groupId })
      .sort({ createdAt: -1 })
      .then(async (groups) => {
        // Get a list of online users in the group, including the sender
        const onlineUsers = getOnlineUsers(groupId, data.senderId);
        onlineUsers.push(data.senderId);

        // Define the message as "File Attached" or use the message from 'data'
        const msg = data.message || "File Attached";
        const { socketUsers } = data;
        const readUserIds = [];
        // Iterate through online users and find those who are group members
        onlineUsers.forEach((ids) => {
          if (groups.groupMembers.includes(ids)) {
            readUserIds.push(ids);
          }
        });

        groups.groupMembers.forEach((userId) => {});
        // update unreadMessage Count for each user in group in redis
        await setChatUnreadCount(groups.groupMembers, groupId, readUserIds);
        // Create a new chat message object for the uploaded file
        const chatMessage = new Chat({
          groupId: groups._id,
          message: msg,
          fileType: path.extname(filename),
          isFile: true,
          filePath: "temp/",
          fileName: filename,
          groupName: groups.groupName,
          sendTo: groups.groupMembers,
          senderId: data.senderId,
          type: data.type,
          readUserIds,
        });
        // Check if the message type is 'group' or 'onetoone' with the sender
        if (
          data.type === user_constants.GROUP ||
          data.type === user_constants.SUPPORT ||
          (data.type === user_constants.ONETOONE &&
            groups.groupMembers.includes(data.senderId))
        ) {
          // Save the chat message for the uploaded file
          await chatMessage.save();

          // Add the 'userName' to the chat message data
          chatMessage._doc.userName = data.userName;

          // Update the group's chat message data
          groupChatMessageUpdateFind(groups._id, msg);

          // Broadcast the chat message to all users in the group
          socket
            .to(groupId.toString())
            .emit(socket_constant.RECEIVED, chatMessage);

          // Notify unread messages to group members
          notifyUnreadAllGroup(groups, {
            senderId: data.senderId,
            socketUsers,
            onlineUsers,
            socket,
            msg,
            userName: data.userName,
            type: data.type,
            isNewFile: true,
            messageData: chatMessage,
          });
        }
      });
  } catch (error) {
    logger.error(
      `[notifyUpload] [Error] while notifying uploads to user=> ${error}`
    );
  }
};
