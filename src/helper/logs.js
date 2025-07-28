const logger  =require("@utils/logger.utils")

/**
 * Socket Group Logs
 * This function used to print logs for group
 * @param {Object} socket  The socket.
 * @param {String} groupName  The group name.
 */
exports.groupLogs = function (socket, groupName) {
  const key = "User Connected For Group - " + groupName;
  const log = {};
  log[key] = socket.handshake.query.senderId;
  logger.info(log);
};

/**
 * Socket Message Log.
 * This function used to print message who sending.
 * @param {String} groupName  The group name.
 * @param {String} senderId   The senderId.
 * @param {String} msg     The user sending Message.
 */
exports.messageLog = function (groupName, senderId, msg) {
  const log = {
    subject: "Message",
    GroupName: groupName,
    SenderId: senderId,
    message: msg,
  };
  logger.info(log);
};

/**
 * Socket FileUpload Log.
 * This function is used to print file upload URL.
 * @param {String} groupName  The group name.
 * @param {String} senderId   The senderId.
 * @param {String} filename   The filename.
 */
exports.fileUploadLog = function (groupName, senderId, filename) {
  const log = {
    subject: "File Upload",
    GroupName: groupName,
    SenderId: senderId,
    filename,
  };
  logger.info(log);
};

/**
 * Socket Online Users Log.
 * This function is used to print Online Users.
 * @param {String} groupName  The group name.
 * @param {String} senderId   The senderId.
 */
exports.onlineUsersLog = function (groupName, senderId) {
  const log = {
    subject: "Online Users",
    GroupName: groupName,
    SenderId: senderId,
  };
  logger.info(log);
};


/**
 * Socket Connected User.
 * This function is used to print Connected user with groupname.
 * @param {String} userId  The user ID.
 */
exports.connectLog = function (userId) {
  const log = {
    subject: "User Connected with Socket!",
    user: userId,
  };
  logger.info(log);
};


/**
 * Socket Disconnected User.
 * This function is used to print Disconnected user with groupname.
 * @param {String} groupName  The group name.
 * @param {String} user   The user.
 */
exports.disconnectLog = function (groupId, user) {
  const log = {
    subject: "User Disconnected",
    groupId,
    user,
  };
  logger.info(log);
};

exports.roomLeft = function (GroupId, user) {
  const log = {
    subject: "User Left From Group",
    GroupId,
    user,
  };
  logger.info(log);
};


