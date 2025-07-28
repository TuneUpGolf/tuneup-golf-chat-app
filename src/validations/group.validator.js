const joi = require('joi');

exports.createGroup = joi.object({
    groupMembers: joi.array().items(joi.string()).required(),
    // senderId: joi.string().required(),
    type: joi.string().required(),
    profile_img: joi.string().optional(),
    isGuest: joi.boolean().optional(),
})

exports.updateGroup = joi.object({
    _id: joi.string().hex().length(24).required(),
    adminMembers: joi.array().items(joi.string()).optional(),
    profile_img: joi.string().optional(),
    groupName: joi.string().optional(),
    isBlocked: joi.string().optional()
})

exports.getGroup = joi.object({
    _id: joi.string().hex().length(24).optional(),
    page: joi.number().required(),
    userPerPage: joi.number().required(),
    groupName: joi.string().optional()
})

exports.deleteGroup = joi.object({
    _id: joi.string().hex().length(24).optional(),
    groupName: joi.string().optional()
})

exports.membersAdd = joi.object({
    groupId: joi.string().required(),
    memberId: joi.array().required(),
    loggedInUserId: joi.string().required(),
    deviceToken: joi.array().optional(),
    isAdmin: joi.boolean().optional(),
});

exports.membersRemove = joi.object({
    groupId: joi.string().required(),
    memberId: joi.string().required(),
    deviceToken: joi.array().optional(),
    userId: joi.string().optional(),
});


exports.uploadProfile = joi.object({
    userId: joi.string().required(),
    groupId: joi.string().hex().length(24).required(),
})

