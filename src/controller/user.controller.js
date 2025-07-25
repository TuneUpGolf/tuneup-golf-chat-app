const { success, failure } = require("@utils/response");
const { serverResponseMessage } = require("@constants/index");
const { socket_constant, user_constants } = require("@constants/index");
const {
  userCreate,
  userUpdate,
  userData,
  getUsers,
  deleteUserById,
} = require("@services/user.services");
const logger = require("@utils/logger.utils");
const jwt = require("jsonwebtoken");
const { config } = require("@config/index");
const { createGroupController } = require('@controller/group.controller')
const { Chat } = require("@models/index")
const { findOtherUserIds } = require('@services/group.services');
const mongoose = require("mongoose");


exports.createUserController = async (req, res) => {
  try {

    const Response = await userCreate({
      ...req.body,
    });
    if (Response)
      return success(res, 200, serverResponseMessage.USER_CREATED, Response);
    else
      return success(res, 204, serverResponseMessage.FAILURE_DATA_CREATE, err);
  } catch (error) {
    console.log(/er/, error.message)

    logger.error(
      `[createUserController] [Error] while creating user=> ${error}`
    );
    return failure(res, 204, serverResponseMessage.ERROR, error.message);
  }
};
/**
 * @name updateUserController
 * @description Updates an existing user and emits an event if successful.
 * @param {Object} req - The request object containing user data.
 * @param {Object} res - The response object to send back the HTTP response.
 * @returns {Promise<void>} - Returns a success or failure response based on the outcome of the user update process.
 * @throws {Object} - Logs an error and returns a failure response if an exception occurs during the process.
 */
exports.updateUserController = async (req, res) => {
  try {
    const Response = await userUpdate(req.body);
    console.log(/Response/, Response);

    const allConnectedUsers = await findOtherUserIds(Response.userId)
    if (Response) {
      global.globalSocket.to([...allConnectedUsers]).emit(socket_constant.UPDATE_USER, {
        Response
      });
      return success(res, 200, serverResponseMessage.USER_UPDATED, Response);
    }
    else return success(res, 204, serverResponseMessage.FAILURE_DATA_UPDATE);
  } catch (error) {
    console.log(/er/, error);

    logger.error(
      `[updateUserController] [Error] while updating user=> ${error}`
    );
    return failure(res, 204, serverResponseMessage.ERROR, error.message);
  }
};

/**
 * @name profileUserController
 * @description Fetches user profile data and handles the response.
 * @param {Object} req - The request object containing user data.
 * @param {Object} res - The response object to send back the HTTP response.
 * @returns {Promise<void>} - Returns a success or failure response based on the outcome of the user data fetch.
 * @throws {Object} - Logs an error and returns a failure response if an exception occurs during the process.
 */
exports.profileUserController = async (req, res) => {
  try {
    const Response = await userData(req.body);
    if (Response && Response.last_seen == null) {
      Response.last_seen = "";
    }
    if (Response)
      return success(res, 200, serverResponseMessage.USER_FETCH, Response);
    else return success(res, 204, serverResponseMessage.DATA_READ_ERROR);
  } catch (error) {
    logger.error(
      `[profileUserController] [Error] while getting user profile user=> ${error}`
    );
    return failure(res, 204, serverResponseMessage.ERROR, error.message);
  }
};


/**
 * Generates a JWT token for a user based on the provided UUID.
 * @param {Object} req - The request object.
 * @param {string} req.body.uuid - The UUID of the user to generate JWT token.
 * @param {Object} res - The response object.
 * @returns {void}
 */
exports.getUserJwtController = (req, res) => {
  try {
    const { userId } = req.body;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return failure(res, 400, "Invalid ObjectId provided", "Invalid ObjectId format");
    }
    //create jwt token 
    const token = jwt.sign({ userId }, config.secret, { expiresIn: config.jwtExpire });
    return success(res, 200, serverResponseMessage.TOKEN_CREATED, token);
  } catch (error) {
    logger.error(`[updateDeviceTokenController] [Error] while updating user device token=> ${error}`);
    return failure(res, 500, serverResponseMessage.INTERNAL_SERVER_ERROR, error.message);
  }
}

/**
 * Asynchronously creates a new group for the provided user UUIDs.
 * @param {Array} uuids - Array of UUIDs representing users to be added to the group.
 * @param {String} type - Type of group, either "onetoone" or "group".
 * @param {String} [groupName] - Name of the group, required for group type.
 * @throws {Error} Throws an error if there is an issue creating the group.
 */
async function createGroup (uuids, type, groupName = "") {
  try {
    const groupNameFinal = type === user_constants.ONETOONE ? uuids.join('_') : groupName;
    const lastMessage = {
      send_At: new Date(),
      message: serverResponseMessage.WELCOME_MESSAGE,
    };
    const groupData = {
      body: {
        groupName: groupNameFinal,
        senderId: uuids[0],
        groupMembers: uuids,
        type,
        last_message: lastMessage,
      },
    };

    const custRes = { json: (data) => data };
    const newGroup = await createGroupController(groupData, custRes);
    if (!newGroup?.data?.length) {
      throw new Error("Error creating group");
    }

    const messageData = {
      groupId: newGroup.data[0]._id,
      message: serverResponseMessage.WELCOME_MESSAGE,
      groupName: groupNameFinal,
      senderId: uuids[0],
      type,
      readUserIds: uuids[0],
      isFile: false,
      sendTo: uuids,
      metadata: null,
    };

    const chatMessage = new Chat(messageData);
    await chatMessage.save();
  } catch (error) {
    logger.error(`[createGroup] [Error] ${error.message}`);
    throw error;
  }
}

exports.deleteUserController = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return failure(res, 400, serverResponseMessage.MISSING_FIELDS);
    }

    const user = await userData({ userId });

    if (!user) {
      return failure(res, 404, serverResponseMessage.USER_NOT_FOUND);
    }

    await deleteUserById(userId);

    return success(res, 200, serverResponseMessage.USER_DELETED_SUCCESSFULLY);
  } catch (error) {
    console.log(/er/, error);

    console.error("[deleteUserController] Error:", error);
    return failure(res, 500, serverResponseMessage.INTERNAL_SERVER_ERROR);
  }
};