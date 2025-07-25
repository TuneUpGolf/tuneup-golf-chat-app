const moment = require("moment");
const { success, failure } = require("@utils/response");
const { user_constants } = require("@constants/index");
const { Chat } = require("@models/index");
const { Group } = require("@models/index");
const group_name = "$groupName";
const mongoose = require('mongoose');


exports.chatList = async (whereArr, perPage, page) => {
  try {
    return await Chat.aggregate([
      {
        $facet: {
          totalCount: [
            {
              $match: whereArr,
            },
            {
              $count: "total",
            },
          ],
          data: [
            {
              $match: whereArr,
            },
            // Add a $match stage for message search
            {
              $match: whereArr.message ? { message: { $regex: new RegExp(whereArr.message, "i") } } : {}
            },
            {
              $lookup: {
                from: "messages",
                let: { parentId: "$parentId" },
                pipeline: [
                  {
                    $match: {
                      $expr: { $eq: ["$_id", "$$parentId"] }
                    }
                  },
                  {
                    $project: { message: 1, _id: 0 }
                  }
                ],
                as: "parentMessageData"
              },
            },
            {
              $unwind: {
                path: "$parentMessageData",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $addFields: {
                parentMessageData: { $ifNull: ["$parentMessageData.message", null] }
              }
            },
            {
              $lookup: {
                from: "users",
                let: { senderIdObj: { $toObjectId: "$senderId" } }, // Convert senderId to ObjectId
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $eq: ["$_id", "$$senderIdObj"]  // Match _id in users, not userId
                      }
                    }
                  }
                ],
                as: "userData"
              }
            },
            {
              $unwind: {
                path: "$userData",
                preserveNullAndEmptyArrays: false
              }
            },

            {
              $sort: {
                createdAt: -1,
              },
            },
            { $skip: perPage * (page - 1) },
            { $limit: perPage },
          ],
        },
      },
      {
        $project: {
          totalpage: {
            $ceil: {
              $divide: [{ $arrayElemAt: ["$totalCount.total", 0] }, perPage],
            },
          },
          totalRecords: { $arrayElemAt: ["$totalCount.total", 0] },
          perPage: {
            $abs: {
              $add: [0, perPage],
            },
          },
          data: "$data",
        },
      },
    ]);
  } catch (error) {
    throw new Error(error);
  }
};


exports.clearChatMessages = async (groupName) => {
  try {
    return await Chat.deleteMany({ groupName }); // Delete all chat messages in the specified group.
  } catch (error) {
    throw new Error(error);
  }
};

exports.unreadChatCount = async (whereArrChat) => {
  try {
    // Clean up group names by creating case-insensitive regex patterns
    const regexPatterns = whereArrChat.groupName["$in"].map(
      (name) => new RegExp(name.trim(), "i")
    );
    whereArrChat.groupName["$in"] = regexPatterns;

    return await Chat.aggregate([
      {
        $match: {
          isDeleted: whereArrChat.isDeleted,
          groupName: { $in: whereArrChat.groupName["$in"] },
          readUserIds: { $nin: whereArrChat.readUserIds["$nin"] },
          senderId: { $nin: whereArrChat.senderId["$nin"] },
          type: { $in: whereArrChat.type },
        },
      },
      { $sort: { updatedAt: -1 } },
      {
        $project: {
          groupName: 1,
        },
      },
      {
        $group: {
          _id: group_name,
          count: { $sum: 1 },
        },
      },
    ]);
  } catch (error) {
    throw new Error(error);
  }
};
exports.unreadGroupOneCount = async (whereArrChat) => {
  try {
    // Clean up group names by creating case-insensitive regex patterns
    return await Chat.aggregate([
      {
        $match: {
          isDeleted: whereArrChat.isDeleted,
          groupName: { $in: whereArrChat.groupName["$in"] },
          readUserIds: { $nin: whereArrChat.readUserIds["$nin"] },
          senderId: { $nin: whereArrChat.senderId["$nin"] },
          type: { $in: whereArrChat.type },
        },
      },
      { $sort: { updatedAt: -1 } },
      {
        $project: {
          groupName: 1,
        },
      },
      {
        $group: {
          _id: group_name,
          count: { $sum: 1 },
        },
      },
    ]);
  } catch (error) {
    throw new Error(error);
  }
};

exports.findAllImages = async (imageKeys) => {
  try {
    return await Chat.find({ fileName: { $in: imageKeys } }); // Find chat messages with image file names in the provided list of imageKeys.
  } catch (error) {
    throw new Error(error);
  }
};

exports.findAllImagesInChat = async (groupName) => {
  try {
    return await Chat.aggregate([
      {
        $match: {
          groupName,
          message: "File Attached", // Match chat messages with the specified group name and message type 'File Attached'.
        },
      },
      {
        $group: {
          _id: null, // Group all matching messages into a single group.
          imagesKeys: {
            $push: "$fileName", // Create an array of image file keys from matching chat messages.
          },
        },
      },
    ]);
  } catch (error) {
    throw new Error(error);
  }
};

exports.allImagesInChat = async (obj) => {
  try {
    return await Chat.find(obj);
  } catch (error) {
    throw new Error(error);
  }
};

exports.deleteMultipleImagesChat = async (fileKeys) => {
  try {
    return await Chat.deleteMany({ fileName: { $in: fileKeys } }); // Delete chat messages with filenames matching the provided fileKeys
  } catch (error) {
    throw new Error(error);
  }
};

exports.allUnreadGlobalCount = async (userId, groupId) => {
  try {
    // Define the criteria for unread global chat messages
    const whereArrChat = {
      isDeleted: false,
      groupId, // Add the filter for the specific group
      readUserIds: { $nin: [userId] },
      senderId: { $nin: [userId] },
      sendTo: { $in: [userId] },
    };

    // Perform aggregation to count unread global messages
    return await Chat.aggregate([
      { $match: whereArrChat },
      { $sort: { updatedAt: -1 } },
      {
        $project: {
          groupName: 1,
          groupId: 1,
          createdAt: 1,
          message: 1,
          readUserIds: 1,
        },
      },
      { $addFields: { userId, createdAt: "$createdAt" } },
      {
        $lookup: {
          from: "groups",
          localField: "groupId",
          foreignField: "_id",
          as: "groupData",
        },
      },
      {
        $unwind: {
          path: "$groupData",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: "$userId",
          count: { $sum: 1 },
          message: { $first: "$message" },
          group_id: { $first: "$groupData._id" },
          readUserIds: { $first: "$groupData.readUserIds" },
          createdAt: { $first: "$createdAt" },
        },
      },
    ]);
  } catch (error) {
    throw new Error(error);
  }
};

exports.getChatMesages = async (where, userName, type, senderId) => {
  try {
    return await Chat.aggregate([
      {
        $match: where,
      },
      {
        $sort: { updatedAt: -1 },
      },
      {
        $project: {
          groupName: 1,
          message: 1,
          updatedAt: 1,
          groupId: 1,
          isFile: 1,
        },
      },
      {
        $group: {
          _id: group_name,
          groupName: { $first: group_name },
          groupId: { $first: "$groupId" },
          message: { $first: "$message" },
          updatedAt: { $first: "$updatedAt" },
          userName: { $first: userName },
          senderId: { $first: senderId },
          type: { $first: type },
          count: { $sum: 1 },
          isFile: { $first: "$isFile" },
        },
      },
    ]);
  } catch (error) {
    throw new Error(error)
  }
}

exports.addChatReaction = async (data) => {
  try {
    return await Chat.findOneAndUpdate(
      { _id: data?.id },
      {
        $push: {
          reactions: {
            user_name: data?.userName,
            user_id: data?.userId,
            reaction: data?.reaction,
            emoji_id: data?.emojiId,
          },
        },
      },
      { new: true }
    );
  } catch (error) {
    throw new Error(error);
  }
}

exports.removeChatReaction = async (data) => {
  try {
    return await Chat.findOneAndUpdate(
      { _id: mongoose.Types.ObjectId(data?.id), "reactions._id": mongoose.Types.ObjectId(data?.reactionId) },
      { $pull: { reactions: { _id: mongoose.Types.ObjectId(data?.reactionId) } } },
      { new: true }
    );
  } catch (error) {
    throw new Error(error)
  }
}


exports.editChatMessage = async (id, message) => {
  try {
    return await Chat.findOneAndUpdate(
      {
        _id: id,
      },
      { message, isEdited: true },
      { new: true } // Returns the updated document
    );
  } catch (error) {
    throw new Error(error);
  }
}

exports.chatFoundPerPage = async (whereArr, user_type, userId, chatPerPage) => {
  try {
    return await Chat.aggregate(
      [
        {
          $match: {
            ...whereArr
          }
        },
        {
          $lookup: {
            from: "messages", // Assuming the collection is "messages"
            let: { matchedTimestamp: "$createdAt", matchedGroupId: "$groupId", sendTo: "$sendTo", userType: user_type, userId: userId }, // Pass timestamp and groupId
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $gte: ["$createdAt", "$$matchedTimestamp"] }, // Match messages with later timestamps
                      { $eq: ["$groupId", "$$matchedGroupId"] }, // Match within the same group
                      {
                        $eq: ["$isDeleted", false]
                      },
                      {
                        $cond: {
                          if: { $ne: ["$$userType", user_constants.ADMIN] }, // If user is not admin
                          then: { $in: ["$$userId", "$$sendTo"] }, // Check if userId is in sendTo
                          else: true // Otherwise, skip this check
                        }
                      }
                    ]
                  }
                }
              },
              {
                $count: "countAfter" // Count messages matching the conditions
              }
            ],
            as: "countAfterMessage"
          }
        },
        {
          $addFields: {
            countAfter: {
              $cond: {
                if: { $eq: [{ $size: "$countAfterMessage" }, 0] }, // If no messages after, set to 0
                then: 0,
                else: { $arrayElemAt: ["$countAfterMessage.countAfter", 0] }
              }
            }
          }
        },
        {
          $addFields: {
            pageNumber: {
              $ceil: {
                $divide: ["$countAfter", chatPerPage] // Correct calculation
              }
            }
          }
        },
        {
          $project: {
            _id: 1, // Include _id field
            message: 1, // Include the message field
            pageNumber: 1, // Include the calculated page number
            countAfter: 1
          }
        }
      ]

    );

  } catch (error) {
    throw new Error(error.message || "Error fetching chat found per page per page");
  }
}

exports.softDeleteMessage = async (id, userId) => {
  try {
    return await Chat.findOneAndUpdate(
      {
        _id: id,
        senderId: userId,
        isDeleted: false
      }, {
      isDeleted: true
    }, { new: true }
    )
  } catch (error) {
    throw new Error(error)
  }
}

exports.getMessage = async (id) => {
  try {
    return Chat.findById(id)
  } catch (error) {
    throw new Error(error)
  }
}

exports.renderMessage = async (message, chatPerPage) => {
  try {
    return await Chat.aggregate(
      [
        //  Match the group and ensure sorting order
        {
          $match: {
            groupId: new mongoose.Types.ObjectId(message.groupId), // Add specific groupId if needed
          },
        },
        // Sort by createdAt descending
        {
          $sort: {
            createdAt: -1, // Adjust sorting order as required
          },
        },
        //  Add a sequential index to each document
        {
          $setWindowFields: {
            sortBy: { createdAt: -1 },
            output: {
              index: { $rank: {} }, // 1-based rank for pagination
            },
          },
        },
        //  Find the document with the parentId
        {
          $match: {
            _id: message.parentId, // Match the specific message by parentId
          },
        },
        // Calculate the page number
        {
          $project: {
            _id: 1, // Include the message ID
            pageNumber: {
              $ceil: { $divide: ["$index", chatPerPage] }, // Calculate page number
            },
          },
        },
      ]
    )
  } catch (error) {
    throw new Error(error.message || "Error fetching render message");;
  }
}

exports.softDeleteMessages = async (messageIds, userId) => {
  try {
    const updateResult = await Chat.updateMany(
      {
        _id: { $in: messageIds },
        senderId: userId,
        isDeleted: false
      },
      { $set: { isDeleted: true } }
    );

    if (updateResult.modifiedCount === 0) {
      // No message actually deleted
      return [];
    }

    // Fetch updated/deleted documents
    return await Chat.find({
      _id: { $in: messageIds },
      senderId: userId,
      isDeleted: true
    });
  } catch (error) {
    throw new Error(error);
  }
};


exports.getMessagesList = async (input) => {
  try {
    return await Chat.find(input).select({ _id: 1 }).lean()
  } catch (error) {
    throw new Error(error);
  }
}

