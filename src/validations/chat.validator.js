const joi = require("joi");

exports.chatList = joi.object({
  groupId: joi.string().hex().length(24).required(),
  userType: joi.string().optional(),
  // userId: joi.number().required(),
  perPage: joi.number().optional(),
  page: joi.number().optional(),
  keepdate: joi.boolean().optional(),
  message: joi.string().optional()
});

exports.userList = joi.object({
  isFilter: joi.boolean().optional(),
  groupName: joi.string().optional(),
  perPage: joi.number().optional(),
  page: joi.number().optional(),
  userName: joi.string().optional(),
  type: joi.array().optional(),
});



exports.clearChat = joi.object({
  _id: joi.string().hex().length(24).required(),
});

exports.allImages = joi.object({
  _id: joi.string().hex().length(24).required(),
});

exports.deleteMultipleImage = joi.object({
  imagesKeys: joi.array().required(),
});
exports.uploadImage = joi.object({
  groupId: joi.string().hex().length(24).required(),
  senderId: joi.string().optional(),
})



exports.removeMessage = joi.object({
  // multiple msgs in array format []
  messageIds: joi.alternatives().try(
    joi.string().hex().length(24),
    joi.array().items(joi.string().hex().length(24))
  ),
  _id: joi.string().hex().length(24),
  userId: joi.string().optional()
}).or('messageIds', '_id');
