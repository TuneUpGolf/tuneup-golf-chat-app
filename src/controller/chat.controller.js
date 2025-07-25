const { success, failure } = require("@utils/response");
const { serverResponseMessage, socket_constant, user_constants } = require("@constants/index");
const {
  groupFind,
  groupChatMessageUpdateFind,
  listGroups
} = require("@services/group.services");
const { getFilteredUser } = require("@services/user.services");
const {
  chatList,
  clearChatMessages,
  findAllImagesInChat,
  allImagesInChat,
  chatFoundPerPage,
  softDeleteMessages,

} = require("@services/chat.services");
const { Group, User } = require("@models/index");
const { Chat } = require("@models/index");
const logger = require("@utils/logger.utils");
const mongoose = require('mongoose')
const {
  handleUpload
} = require("@controller/socket.controller");
const { redisClient } = require("@root/config/redis.config");
const digitalOceanService = require("../services/digitalOceanService");

/**
 * Controller function to retrieve a list of chat messages for a specific group and user.
 *
 * @async
 * @function chatListController
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 * @returns {Promise<void>} - Resolves to a response with the chat list or an error response.
 */
exports.chatListController = async (req, res, next) => {
  try {
    const { groupId, page = 0, perPage, message, userType } = req.body;
    const { userId } = req.user
    const chatPerPage = perPage ? parseInt(perPage, 10) : 20;
    const { user_type } = req;
    // Update whereArr to include search criteria for messages
    const whereArr = {
      groupId: mongoose.Types.ObjectId(groupId),
      isDeleted: false,
      // Conditionally add message search
      ...(message && message.trim() !== "" && {
        $or: [{ message: { $regex: new RegExp(message, "i") } }],
      }),
    };

    if (user_type !== user_constants.ADMIN) {
      whereArr.sendTo = { $in: [userId] };
    }    // Add condition for userType "customer" or "guest"
    if (userType === 'user' || userType === 'guest') {
      whereArr.isTerminated = false;
    }
    const response = await chatList(whereArr, chatPerPage, Math.max(1, page));
    console.log(/response/, response);

    if (message && response[0].data.length) {
      const messageFoundPage = await chatFoundPerPage(whereArr, user_type, userId, chatPerPage)

      response[0].messageFoundPage = messageFoundPage
    }
    console.log(/response12/, response);

    return success(
      res,
      200,
      serverResponseMessage.GROUP_CHAT_MESSAGE,
      response
    );
  } catch (error) {
    console.log(error);

    logger.error(
      `[chatListController] [Error] while listing all chats=> ${error}`
    );
    return failure(
      res,
      500,
      serverResponseMessage.INTERNAL_SERVER_ERROR,
      error.message
    );
  }
};



/**
 * Controller function to retrieve a list of chat groups for a specific user.
 *
 * @async
 * @function newChatGroupListController
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 * @returns {Promise<void>} - Resolves to a response with the chat group list or an error response.
 */
exports.newChatGroupListController = async (req, res, next) => {
  try {
    const { page, isFilter } = req.body;
    const { userId } = req.user;
    console.log(userId)
    let { type, perPage, groupName } = req.body;
    const { user_type } = req;
    let totalCount = 0;
    if (!isFilter) {
      groupName = '';
    }
    let response = [];
    const perPageResponse = perPage;
    // if filter is applied search for users and onetoone groups
    if (isFilter && type.includes(user_constants.ONETOONE)) {
      const userResult = await getFilteredUser({ userId, groupName, page, perPage })
      response = userResult.data
      totalCount += userResult.totalCount;
      perPage -= response.length;
    }
    if (isFilter && type.includes(user_constants.ONETOONE)) {
      type = type.filter((groupType) => {
        return groupType !== user_constants.ONETOONE;
      });
    }

    // search for groups based on filter
    let data = [];
    if (perPage > 0) {
      const result = await listGroups({ userId, page, perPage, groupName, type, isFilter, user_type });
      console.log(/result/, result);

      data = result.data || [];
      totalCount += result.totalCount ?? 0;
    }
    console.log(/dta/, data);

    for (const item of data) {
      response.push(item);
    }
    // find unread messages count based on groupIds and userId
    const responseWithUnreadCount = await Promise.all(response.map(async (group) => {
      if (group.groupId) {
        const hashKey = `${userId}:${group.groupId.toString()}`;   //create hashKey based on userId:groupId
        let unreadMessageCount = await redisClient.get(hashKey);  // get unreadCount from redis 
        // Convert val to a number if it's present, or default to 0 if it's not
        unreadMessageCount = unreadMessageCount != null ? Number(unreadMessageCount) : 0;
        // Add the unreadCount field to the group object
        group['unreadCount'] = unreadMessageCount;
      }
      return group;
    }));

    //sort the result based on last message send at time 
    responseWithUnreadCount.sort((a, b) => {
      const dateA = new Date(a.lastMessageSendAt);
      const dateB = new Date(b.lastMessageSendAt);
      return dateB - dateA;
    });
    const resObject = {
      page,
      perPage: perPageResponse,
      totalRecords: totalCount,
      data: responseWithUnreadCount
    }

    return success(res, 200, serverResponseMessage.Group_list, resObject);

  } catch (error) {
    logger.error(
      `[chatGroupListController] [Error] while listing all groups => ${error}`
    );
    return failure(
      res,
      500,
      serverResponseMessage.INTERNAL_SERVER_ERROR,
      error.message
    );
  }
};


/**
 * Controller function to clear chat messages for a specific group.
 *
 * @async
 * @function clearChatController
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @returns {Promise<void>} - Resolves to a response with the result of chat clearing or an error response.
 */
exports.clearChatController = async (req, res, next) => {
  try {
    const { _id } = req.body;
    const isGroup = await groupFind({ _id });
    if (!isGroup) {
      return failure(res, 204, serverResponseMessage.GROUP_NOT_PRESENT, {});
    }
    // Find all images in the chat, clear chat messages, and update chat message count in parallel
    const [imagesChat, clearChatMsg] = await Promise.all([
      findAllImagesInChat(isGroup.groupName),
      clearChatMessages(isGroup.groupName),
      groupChatMessageUpdateFind(isGroup._id),
    ]);
    // If there are images found in the chat, delete them from AWS
    if (imagesChat.length) {
      await digitalOceanService.deleteMultipleImages(imagesChat[0].imagesKeys);
    }
    return success(res, 200, serverResponseMessage.CHAT_CLEAR, clearChatMsg);
  } catch (error) {
    logger.error(
      `[clearChatController] [Error] while deleting chats => ${error.message}`
    );
    return failure(
      res,
      500,
      serverResponseMessage.INTERNAL_SERVER_ERROR,
      error.message
    );
  }
};

/**
 * Controller function to retrieve all images in the chat associated with a specific group and user.
 *
 * @async
 * @function allImageController
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @returns {Promise<void>} - Resolves to a response with the list of images or an error response.
 */
exports.allImageController = async (req, res, next) => {
  try {
    const { _id } = req.body;
    const isGroup = await groupFind({ _id });
    if (!isGroup) {
      return failure(res, 204, serverResponseMessage.GROUP_NOT_PRESENT, {});
    }
    // Retrieve all images in the chat associated with the group
    const imageResponse = await allImagesInChat({
      groupId: isGroup._id,
      // groupName: isGroup.groupName,
      // senderId: userId,
      isFile: true,
      //fileType: [".jpg", ".png"],
    });
    return success(res, 200, serverResponseMessage.ALL_IMAGES_FETCHED, {
      data: imageResponse,
    });
  } catch (error) {
    logger.error(
      `[allImageController] [Error] while fetching all images => ${error.message}`
    );
    return failure(
      res,
      500,
      serverResponseMessage.INTERNAL_SERVER_ERROR,
      error.message
    );
  }
};


/**
 * This function handles the upload of an image to a group chat. It checks if the user is a member of the group,
 * processes the uploaded file, and emits a socket event with the file data.
 * 
 * @param {Object} req - The request object containing the uploaded file, group ID, and user ID.
 * @param {Object} res - The response object used to send back the appropriate response.
 * @param {Function} next - The next middleware function in the stack.
 */


// Controller: removeMessage
exports.removeMessage = async (req, res) => {
  try {
    const { messageIds, _id } = req.body;
    const { userId } = req.user;
    console.log("Request body:", req.body);
    const idsToDelete = messageIds || (_id ? [_id] : []);

    if (idsToDelete.length === 0) {
      return failure(res, 400, "No messageIds or _id provided");
    }

    const removedMessages = await softDeleteMessages(idsToDelete, userId);

    console.log("/removedMessages/", removedMessages);

    if (!removedMessages || removedMessages.length === 0) {
      return failure(res, 404, serverResponseMessage.MESSAGE_NOT_FOUND_IN_CHAT);
    }

    // Emit socket event for each deleted message
    removedMessages.forEach((message) => {
      const data = {
        messageId: message._id.toString(),
        groupId: message.groupId.toString()
      };
      global.globalSocket.to(message.groupId.toString()).emit(socket_constant.DELETE_MESSAGE, data);
    });

    return success(
      res,
      200,
      serverResponseMessage.MESSAGE_DELETED,
      removedMessages.map(msg => msg._id)
    );
  } catch (error) {
    console.log("/er/", error);

    logger.error(
      `[removeMessage] [Error] while removing chat messages => ${error.message}`
    );
    return failure(
      res,
      500,
      serverResponseMessage.INTERNAL_SERVER_ERROR,
      error.message
    );
  }
};




/**
 * This function handles the upload of an image to a group chat. It checks if the user is a member of the group,
 * processes the uploaded file, and emits a socket event with the file data.
 * 
 * @param {Object} req - The request object containing the uploaded file, group ID, and user ID.
 * @param {Object} res - The response object used to send back the appropriate response.
 * @param {Function} next - The next middleware function in the stack.
 */
exports.uploadImageController = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return failure(
        res,
        400,
        serverResponseMessage.SELECT_FILE,
      );
    }
    const group = await Group.findById(req.body.groupId);
    if (!group) {
      return failure(res, 404, "Group not found");
    }
    const obj = {};
    for (const a of group.groupMembers) {
      obj[a] = true;
    }

    const uploadFiles = req.files.map((file) => {
      const data = {
        fileData: file.buffer,
        groupId: req.body.groupId,
        filename: file.originalname,
        senderId: req.body?.senderId || req.body?.userId,
        socketUsers: obj,
        type: group.type
      }
      return handleUpload(global.globalSocket, data);
    })
    await Promise.all(uploadFiles)
    return success(
      res,
      201,
      serverResponseMessage.FILE_SENT_SUCCESSFULLY
    );

  } catch (error) {
    console.log(/er/, error);

    logger.error(
      `[uploadImage] [Error] while uploading image => ${error.message}`
    );
    return failure(
      res,
      500,
      serverResponseMessage.INTERNAL_SERVER_ERROR,
      error.message
    );
  }
}



