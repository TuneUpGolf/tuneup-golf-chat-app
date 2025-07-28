const { ObjectId } = require("mongoose").Types;

const { User } = require("@models/index.js");
const { logger } = require("../utils");
const { default: mongoose } = require("mongoose");
RegExp.escape = function (s) {
  return s.replace(/[\\^$*+?.()|[\]{}-]/g, "\\$&");
};

exports.userCreate = async (req) => {
  try {
    return await User.create(req);
  } catch (error) {
    console.log(error)
    throw new Error(error);
  }
};

exports.userUpdate = async (req, Id) => {
  try {
    const id = Id || req._id;
    const query = {};
    if (req?.uuid) {
      query.uuid = req?.uuid;
    } else {
      query._id = ObjectId(id);
    }
    return await User.findOneAndUpdate(
      query,
      { $set: { ...req } },
      { new: true }
    ).lean();
  } catch (error) {
    console.log(/er/, error);

    throw new Error(error);
  }
};


exports.userData = async (input) => {
  try {
    if (input.userId) {
      return await User.findById(input.userId).lean();
    } else if (input.email) {
      return await User.findOne({ email: input.email }).lean();
    } else {
      return null;
    }
  } catch (error) {
    throw new Error(error);
  }
};


exports.userIdData = async (userId) => {
  try {
    return await User.findOne({ userId }).select({ full_name: 1 });
  } catch (error) {
    throw new Error(error);
  }
};

// Service to delete user by userId
exports.deleteUserById = async (input) => {
  return await User.deleteOne({ _id: input });
};


exports.userAll = async (groupMembers) => {
  try {
    return await User.find({ userId: { $nin: groupMembers } }).sort({ full_name: 1 });;
  } catch (error) {
    throw new Error(error);
  }
};

exports.userFind = async (query) => {
  try {
    return await User.findOne(query);
  } catch (error) {
    throw new Error(error);
  }
};

exports.updateUserDetailOnUserId = async (userId, req) => {
  try {
    return await User.findOneAndUpdate(
      {
        userId,
      },
      { $set: { ...req } },
      { new: true }
    ).lean();
  } catch (error) {
    throw new Error(error);
  }
};



exports.updateUserStatus = async (userId) => {
  try {
    return await User.findOneAndUpdate(
      {
        userId,
        user_status: "0",
      },
      {
        $set: { user_status: "1" },
      },
      {
        new: true,
      }
    );
  } catch (error) {
    throw new Error(error);
  }
}

exports.changeUserStatus = async (userId) => {
  try {
    return await User.findOneAndUpdate(
      {
        userId,
        user_status: "1",
      },
      {
        $set: { user_status: "0" },
      },
      {
        new: true,
      }
    );
  } catch (error) {
    throw new Error(error);
  }
}




exports.checkValidGroupMembers = async (memberIds) => {
  try {
    const validObjectIds = memberIds.filter(id => mongoose.Types.ObjectId.isValid(id));
    return await User.find({ _id: { $in: validObjectIds } });
  } catch (error) {
    logger.error(`[checkValidGroupMembers] Failed to validate group members: ${error}`);
    throw new Error(error);
  }
};

