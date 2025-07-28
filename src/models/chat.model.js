module.exports = (mongoose) => {
  const chatSchema = new mongoose.Schema(
    {
      message: {
        type: String,
      },
      parentId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null,
      },
      groupId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "Group",
        index: true
      },
      groupName: {
        type: String,
        index: true
      },
      senderId: {
        type: String,
      },
      fileName: {
        type: String,
      },
      isFile: {
        type: Boolean,
      },
      fileType: {
        type: String,
      },
      filePath: {
        type: String,
      },
      readUserIds: {
        type: [String],
      },
      metadata: {
        type: Map,
        default: new Map(),
      },
      type: {
        type: String,
      },


      fileUrl: {
        type: String,
      },
      sendTo: {
        type: [String],
      },
      isDeleted: {
        type: Boolean,
        default: false,
      },
      reactions: [
        {
          user_name: String,
          user_id: String,
          reaction: String,
          emoji_id: String
        }
      ]
    },
    {
      timestamps: true,
      collection: "messages",
    }
  );
  chatSchema.index(
    { groupName: 1, readUserIds: 1, senderId: 1, type: 1, updatedAt: -1 },
    { partialFilterExpression: { isDeleted: false } }
  );
  chatSchema
    .virtual("test")
    .get(function () {
      return this._test;
    })
    .set(function (v) {
      this._test = v;
    });

  return mongoose.model("Chat", chatSchema);
};
