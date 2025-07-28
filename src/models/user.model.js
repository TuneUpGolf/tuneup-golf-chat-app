
module.exports = (mongoose) => {
  const userSchema = new mongoose.Schema(
    {
      userId: {
        type: String,
        unique: false,  // This allows duplicates for userId
        index: true,
      },
      name: {
        type: String,
        required: true,
      },
      email: {
        type: String,
        unique: true,
        required: true,
      },
      country: {
        type: String,
      },
      country_code: {
        type: String,
      },
      dial_code: {
        type: String,
      },
      phone: {
        type: String,
      },
      avatar: {
        type: String,
        default: null,
      },

      lang: {
        type: String,
        default: 'en',
      },
      plan_id: {
        type: String,
      },
      tenant_id: {
        type: [String],
        required: true,
      },
      plan_expired_date: {
        type: Date,
        default: null,
      },
      active_status: {
        type: Boolean,
        default: true,
      },
      type: {
        type: String,
      },
      last_seen: {
        type: Date,
        default: "",
      },
      created_at: {
        type: Date,
        default: Date.now,
      },
      updated_at: {
        type: Date,
        default: Date.now,
      },
      logo: {
        type: String,
        default: null,
      },
    },
    {
      timestamps: false,
      collection: "users",
    }
  );

  return mongoose.model("User", userSchema);
};
