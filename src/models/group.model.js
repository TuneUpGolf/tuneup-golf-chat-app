module.exports = (mongoose) => {
  const groupSchema = new mongoose.Schema(
    {
      groupName: {
        type: String,
      },
      
      groupMembers: {
        type: Array,
      },
      type: {
        type: String,
        enum: ["onetoone", "group", "support"],
        default: "onetoone",
      },
      senderId: {
        type: String,
      },
      removedUsers: {
        type: Map,
        required: true,
        default: new Map(),
      },
      addedUsers: {
        type: Map,
        of: [Date],
        required: true,
        default: new Map(),
      },
      status: {
        type: String,
        enum: ["open", "close"],
        default: "open",
      },
      adminMembers: {
        type: Array,
      },
      isDeleted: {
        type: Boolean,
        default: false,
      },
      isBlocked: {
        type: Boolean,
        enum: [true, false],
        default: false,
      },
      last_message: {
        type: Object,
        default: {
          send_At: new Date(),
          message: "",
        },
      },
      profile_img: {
        type: String,
        default: null,
      },

    },
    {
      timestamps: true,
      collection: "groups",
    }
  );
  groupSchema.index(
    { groupMembers: 1, type: 1, groupName: 1 },
    { partialFilterExpression: { isDeleted: false } }
  );
  return mongoose.model("Group", groupSchema);
};
