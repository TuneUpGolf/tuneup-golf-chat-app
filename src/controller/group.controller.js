const moment = require("moment");
const { success, failure } = require("@utils/response");
const { serverResponseMessage } = require("@constants/index");
const {
  groupCreate,
  groupFind,

  groupDelete,
  groupDetailsBasedOnId,

} = require("@services/group.services");
const { socket_constant, user_constants } = require("@constants/index");
const {
  clearChatMessages,
  findAllImagesInChat,
} = require("@services/chat.services");
const logger = require("@utils/logger.utils");

const sharp = require('sharp');
const { checkValidGroupMembers } = require("../services/user.services");

/**
 * This function handles the creation of a new group chat. It checks if a group with the same members already exists
 * for one-to-one chats, validates the number of group members, creates the group, and emits a socket event with the new group data.
 * 
 * @param {Object} req - The request object containing the group name, members, and type.
 * @param {Object} res - The response object used to send back the appropriate response.
 */


exports.createGroupController = async (req, res) => {
  try {
    const { groupMembers, type } = req.body;
    const senderId = req.user.userId;
    groupMembers.push(senderId);
    // Validate number of members
    if (groupMembers.length > 2 && type === user_constants.ONETOONE) {
      return failure(res, 400, serverResponseMessage.ATMOST_TWO_MEMBERS_ALLOWED);
    }

    if (groupMembers.length < 2) {
      return failure(res, 400, serverResponseMessage.ATLEAST_TWO_MEMBERS_REQUIRED);
    }

    // Validate sender is included and not more than 2 members for one-to-one
    if (type === user_constants.ONETOONE) {
      if (!groupMembers.includes(senderId)) {
        return failure(res, 400, serverResponseMessage.SENDER_MUST_BE_INCLUDED);
      }

      const others = groupMembers.filter(id => id !== senderId);
      if (others.length !== 1) {
        return failure(res, 400, serverResponseMessage.ONLY_ONE_RECIPIENT_ALLOWED);
      }

      const existingGroup = await groupFind({
        groupMembers: { $all: groupMembers },
        type,
        isDeleted: false,
      });

      if (existingGroup) {
        return failure(res, 400, serverResponseMessage.GROUP_ALREADY_CREATED);
      }
    }

    // Validate all user IDs exist
    const foundUsers = await checkValidGroupMembers(groupMembers);
    if (foundUsers.length !== groupMembers.length) {
      return failure(res, 400, serverResponseMessage.INVALID_GROUP_MEMBERS);
    }

    // Create the group
    const grpCreateRes = await groupCreate(req.body);
    const addedUsersData = await groupDetailsBasedOnId(grpCreateRes._id);

    for (const member of groupMembers) {
      grpCreateRes.addedUsers.set(member.toString(), [moment.utc(new Date())]);
    }
    await grpCreateRes.save();

    // Emit NEW_GROUP_CREATE socket event
    addedUsersData[0].groupMembers.forEach(userId => {
      globalSocket.to(userId).emit("NEW_GROUP_CREATE", addedUsersData);
    });

    return success(res, 200, serverResponseMessage.GROUP_CREATED, addedUsersData);
  } catch (error) {
    console.error("[createGroupController] Error:", error);
    return failure(res, 500, serverResponseMessage.INTERNAL_SERVER_ERROR, error.message);
  }
};



/**
 * Controller to fetch group details based on given criteria.
 * @param {Object} req - The request object containing group search criteria, userPerPage, and page.
 * @param {Object} res - The response object to send the results or errors.
 * @returns {Promise<void>} - Sends a response with group details or an error message.
 */
exports.getGroupController = async (req, res) => {
  try {
    const { userPerPage, page } = req.body;
    const whereArr = req.body._id
      ? { _id: req.body._id }
      : { groupName: req.body.groupName };
    const groupResponse = await groupFind(whereArr);

    if (groupResponse) {
      const grpGetRes = await groupDetailsBasedOnId(groupResponse._id, userPerPage, page);

      if (grpGetRes) {
        const responseObj = {
          groupDetail: grpGetRes[0],
          totalMembers: groupResponse.groupMembers.length,
          page,
          userPerPage,
        };
        return success(
          res,
          200,
          serverResponseMessage.GROUP_FETCH,
          responseObj
        );
      } else {
        return failure(
          res,
          204,
          serverResponseMessage.FAILURE_DATA_GET,
          "Error fetching group details"
        );
      }
    } else {
      return success(
        res,
        204,
        serverResponseMessage.GROUP_DOES_NOT_EXIST,
        groupResponse
      );
    }
  } catch (error) {
    console.log(/er/, error);

    logger.error(
      `[getGroupController] [Error] while fetching group => ${error}`
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
 * This function handles the deletion of a group chat. It checks if the group exists,
 * deletes the group, deletes any associated images, clears chat messages, and emits a socket event with the deleted group information.
 * 
 * @param {Object} req - The request object containing the group ID.
 * @param {Object} res - The response object used to send back the appropriate response.
 */
exports.deleteGroupController = async (req, res) => {
  try {
    const groupResponse = await groupFind({ _id: req.body._id });
    if (groupResponse) {
      // Delete the group
      const grpDeleteRes = await groupDelete(groupResponse);
      // Find all images in the chat
      const findImagesChat = await findAllImagesInChat(grpDeleteRes.groupName);
      if (findImagesChat.length) {
        // Delete multiple images
        // await aws.deleteMultipleImages(findImagesChat[0].imagesKeys);
      }
      // Clear chat messages
      await clearChatMessages(grpDeleteRes.groupName);
      global.globalSocket.to(groupResponse?.groupMembers).emit(socket_constant.DELETE_GROUP, grpDeleteRes);
      if (grpDeleteRes) {
        return success(
          res,
          200,
          serverResponseMessage.GROUP_DELETE,
          grpDeleteRes
        );
      } else {
        return failure(
          res,
          204,
          serverResponseMessage.FAILURE_DATA_CREATE,
          err
        );
      }
    } else {
      return failure(res, 400, serverResponseMessage.GROUP_DOES_NOT_EXIST);
    }
  } catch (error) {
    logger.error(
      `[deleteGroupController] [Error] while deleting group=> ${error}`
    );
    return failure(res, 204, serverResponseMessage.ERROR, error.message);
  }
};



