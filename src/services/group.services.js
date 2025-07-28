const moment = require("moment");
const { ObjectId } = require("mongoose").Types;
const { perPage } = require("@config/index");
const { Group } = require("@models/index");
const logger = require("@utils/logger.utils")

exports.groupCreate = async (req) => {
  try {
    return await Group.create(req);
  } catch (error) {
    throw new Error(error);
  }
};
exports.groupFind = async (req) => {
  try {
    return await Group.findOne(req);
  } catch (error) {
    throw new Error(error);
  }
};

exports.groupFindUpdate = async (name) => {
  try {
    return await Group.findOneAndUpdate(
      { groupName: name },
      { $set: { isBlocked: true } },
      { returnOriginal: false }
    );
  } catch (error) {
    throw new Error(error);
  }
};

exports.groupDetailsUpdate = async (data) => {
  try {
    return await Group.findOneAndUpdate(
      {
        _id: ObjectId(data._id),
      },
      { $set: { ...data } },
      { new: true }
    ).lean();
  } catch (error) {
    throw new Error(error);
  }
};

exports.groupUpdate = async (data) => {
  try {
    return await Group.findOneAndUpdate(
      {
        $and: [
          { _id: data.groupId },
          { groupMembers: { $nin: [data.memberId] } },
        ],
      },
      { $push: { groupMembers: data.memberId } },
      { new: true }
    );
  } catch (error) {
    throw new Error(error);
  }
};

exports.groupRemoveUpdate = async (data) => {
  try {
    return await Group.findOneAndUpdate(
      {
        $and: [
          { _id: data.groupId },
          { groupMembers: { $in: [data.memberId] } },
        ],
      },
      { $pull: { groupMembers: data.memberId } },
      { new: true }
    );
  } catch (error) {
    throw new Error(error);
  }
};


exports.groupFindAll = async (req) => {
  try {
    return await Group.find(req);
  } catch (error) {
    throw new Error(error);
  }
};

exports.groupChatMessageUpdateFind = async (id, message = null) => {
  try {
    return await Group.findOneAndUpdate(
      {
        _id: ObjectId(id),
      },
      {
        $set: {
          last_message: {
            send_At: new Date(),
            message: message || "",
          },
        },
      },
      { new: true }
    ).lean();
  } catch (error) {
    throw new Error(error);
  }
};

const group_members = "$groupMembers";
const profile_img = "$profile_img";
const last_message = "$last_message.message";
const last_message_send_At = "$last_message.send_At";
exports.updateUserData = async ({
  userId,
  page,
  perPageRecord,
  groupName
}) => {
  try {
    const pageRecord = perPageRecord || perPage;
    groupName = groupName || "";
    const type = ["group"];
    return await Group.aggregate([
      {
        $match: {
          groupMembers: {
            $in: [userId],
          },
          type: {
            $in: type,
          },
          groupName: {
            $regex: groupName,
            $options: "i",
          },
          isDeleted: false,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "groupMembers",
          foreignField: "userId",
          as: "userData",
        },
      },
      {
        $lookup: {
          from: "messages",
          localField: "_id",
          foreignField: "groupId",
          as: "chatMessage",
        },
      },
      {
        $unwind: {
          path: "$chatMessage",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: "$_id",
          chatId: {
            $last: "$chatMessage._id",
          },
          sendTo: {
            $last: "$chatMessage.sendTo",
          },
          readUserIds: {
            $last: "$chatMessage.readUserIds",
          },
          chatSenderId: {
            $last: "$chatMessage.senderId",
          },
          groupName: {
            $last: "$groupName",
          },
          groupMembers: {
            $last: group_members,
          },
          type: {
            $last: "$type",
          },
          senderId: {
            $last: "$senderId",
          },
          removedUsers: {
            $last: "$removedUsers",
          },
          addedUsers: {
            $last: "$addedUsers",
          },
          status: {
            $last: "$status",
          },
          adminMembers: {
            $last: "$adminMembers",
          },
          isDeleted: {
            $last: "$isDeleted",
          },
          isBlocked: {
            $last: "$isBlocked",
          },
          block_userId: {
            $last: "$block_userId"
          },
          profile_img: {
            $last: profile_img,
          },
          message: {
            $last: last_message,
          },
          metadata: {
            $last: "$chatMessage.metadata",
          },
          send_At: {
            $last: last_message_send_At,
          },
          createdAt: {
            $last: "$createdAt",
          },
          updatedAt: {
            $last: "$updatedAt",
          },
          chatUpdatedId: {
            $last: "$chatMessage.updatedAt",
          },
          userData: {
            $last: "$userData",
          },
          muteUsers: {
            $last: "$muteUsers",
          },
        },
      },
      {
        $sort: { chatUpdatedId: -1 },
      },
      {
        $project: {
          _id: 1,
          chatId: 1,
          sendTo: 1,
          readUserIds: 1,
          chatSenderId: 1,
          groupName: 1,
          groupMembers: 1,
          type: 1,
          senderId: 1,
          removedUsers: 1,
          addedUsers: 1,
          status: 1,
          adminMembers: 1,
          isDeleted: 1,
          isBlocked: 1,
          block_userId: 1,
          profile_img: 1,
          message: 1,
          send_At: 1,
          createdAt: 1,
          updatedAt: 1,
          userData: 1,
          muteUsers: 1,
          metadata: 1
        },
      },
      { $skip: pageRecord * (page - 1) },
      { $limit: pageRecord },
    ]);
  } catch (error) {
    throw new Error(error);
  }
};

exports.findGroupById = (groupId) => {
  return Group.findById(groupId);
};

exports.groupDelete = async (data) => {
  try {
    return await Group.findByIdAndDelete(data._id);
  } catch (error) {
    throw new Error(error);
  }
};

/**
 * Fetches detailed information about a group and its members based on the group ID.
 * The function uses MongoDB aggregation to perform a lookup for user data, sorting, and pagination.
 * It returns the group details along with a paginated list of group members.
 * @param {ObjectId} _id - The ID of the group to fetch details for.
 * @param {number} userPerPage - The number of users to include per page.
 * @param {number} page - The page number to fetch.
 * @returns {Promise<Array>} - A promise that resolves to an array containing group details and paginated user data.
 * @throws {Error} - Throws an error if there is an issue with the database query.
 */
exports.groupDetailsBasedOnId = async (_id, userPerPage, page) => {
  try {
    let skipUsers;
    let sliceStage;

    if (!userPerPage || !page) {
      userPerPage = null; // Set to null to indicate no pagination
      sliceStage = {}; // No slicing needed
    } else {
      skipUsers = (page - 1) * userPerPage;
      sliceStage = { $slice: ["$userData", skipUsers, userPerPage] };
    }

    const pipeline = [
      {
        $match: {
          _id: ObjectId(_id),
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "groupMembers",
          foreignField: "userId",
          as: "userData",
        },
      },
      {
        $sort: {
          "last_message.send_At": -1,
        },
      },
      {
        $project: {
          _id: 1,
          groupName: 1,
          groupMembers: 1,
          type: 1,
          senderId: 1,
          removedUsers: 1,
          addedUsers: 1,
          status: 1,
          adminMembers: 1,
          isDeleted: 1,
          isBlocked: 1,
          message: last_message,
          send_At: last_message_send_At,
          createdAt: 1,
          updatedAt: 1,
          muteUsers: 1,
          profile_img: 1,
          userData: userPerPage ? sliceStage : "$userData", // Apply slice if pagination is set
        },
      },
    ];

    return await Group.aggregate(pipeline);
  } catch (error) {
    throw new Error(error);
  }
};

/**
 * Lists groups the specified user is a member of, filtered and paginated based on the provided criteria.
 * @param {Object} params - The parameters for listing groups.
 * @param {string} params.userId - The ID of the user whose groups are to be listed.
 * @param {number} params.page - The page number for pagination.
 * @param {number} params.perPage - The number of groups per page.
 * @param {string} [params.groupName] - Optional. The name of the group to filter by.
 * @param {Array<string>} params.type - The types of groups to include.
 * @returns {Promise<Array<Object>>} - A promise that resolves to an array of groups.
 * @throws {Error} - If an error occurs during the process.
 */
exports.listGroups = async ({ userId, page, perPage, groupName, type, isFilter, user_type }) => {
  try {
    groupName = groupName || "";
    const results = await Group.aggregate([
      {
        $match: {
          ...(
            user_type !== 'admin' ? { groupMembers: { $in: [userId] } } : {}
          ),
          ...({ type: { $in: type } }),

          // Add condition for groupName if it's not an empty string
          ...(groupName && { groupName: { $regex: groupName, $options: 'i' } }),

          isDeleted: false,
        },
      },
      {
        $facet: {
          totalCount: [
            { $count: "count" }
          ],
          data: [
            { $sort: { 'last_message.send_At': -1 } },
            { $skip: perPage * (page - 1) },
            { $limit: perPage },
            {
              $addFields: {
                groupMembersCount: { $size: "$groupMembers" } // Adding the count of groupMembers
              }
            },
            {
              $lookup: {              // Lookup details of group members excluding the login user
                from: "users",
                let: { userId: group_members, loginUserId: userId },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [
                          { $in: ["$userId", "$$userId"] },
                          { $ne: ["$userId", "$$loginUserId"] }
                        ]
                      }
                    }
                  },
                  {
                    $project: {
                      _id: 1,
                      userId: 1,
                      uuid: 1,
                      full_name: 1,
                      avatar: 1,
                      user_status: 1,
                      user_mood: 1,
                      last_seen: 1
                    }
                  }
                ],
                as: "groupMembers"
              }
            },
            {
              $addFields: {        // Conditionally include group members only for one-to-one groups
                groupMembers: {
                  $cond: {
                    if: { $in: ["$type", ["onetoone", "support"]] },
                    then: group_members,
                    else: []
                  }
                }
              }
            },
            {
              $group: {           // Group documents to structure the final output
                _id: "$_id",
                groupName: { $first: "$groupName" },
                type: { $first: "$type" },
                profile_img: { $first: profile_img },
                groupMembers: { $first: group_members },
                groupMembersCount: { $first: "$groupMembersCount" },
                lastMessage: { $first: last_message },
                lastMessageSendAt: { $first: last_message_send_At },
                status: { $first: "$status" },
                isBlocked: { $first: "$isBlocked" },
                block_userId: { $first: "$block_userId" },
              }
            },
            {                    // Project fields to include in the final output
              $project: {
                groupId: "$_id",
                _id: 0,
                groupName: 1,
                isBlocked: 1,
                lastMessage: 1,
                lastMessageSendAt: 1,
                block_userId: 1,
                profile_img: {
                  $cond: {
                    if: { $eq: ["$type", "onetoone"] },
                    then: "$$REMOVE",
                    else: profile_img
                  }
                },
                type: 1,
                groupMembers: 1,
                groupMembersCount: 1,
                status: 1
              }
            },
          ]
        }
      },
      {
        $project: {
          totalCount: { $arrayElemAt: ["$totalCount.count", 0] },
          data: 1
        }
      }
    ]);

    return results[0];
  } catch (error) {
    throw new Error(error);
  }
};



/**
 * Finds other user IDs with whom the specified user is in one-to-one groups.
 * @param {string} userId - The ID of the user for whom to find other user IDs.
 * @returns {Promise<Array<string>>} - A promise that resolves to an array of other user IDs.
 * @throws {Error} - If no groups are found or an error occurs during the process.
 */
exports.findOtherUserIds = async (userId) => {
  try {
    // Aggregation pipeline
    const groups = await Group.aggregate([
      {
        $match: {
          groupMembers: userId,
          type: "onetoone"
        }
      },
      {
        $project: {
          otherUserId: {
            $filter: {
              input: group_members,
              as: "memberId",
              cond: { $ne: ["$$memberId", userId] }
            }
          }
        }
      },
      {
        $unwind: "$otherUserId"
      },
      {
        $project: {
          _id: 0,
          otherUserId: 1
        }
      }
    ]);
    const result = groups.map(group => group.otherUserId);
    result.push(userId)
    return result;
  } catch (error) {
    console.log(/er/, error);

    logger.error(`[findOtherUserIds] [Error] => ${error}`);
    throw error;
  }
}

exports.updateGroupStatus = async (groupId, status) => {
  try {
    return await Group.findOneAndUpdate(
      { _id: groupId },
      { $set: { status } },
      { new: true }
    );
  } catch (error) {
    throw new Error(error);
  }
};

