const mongoose = require("mongoose");
const memberSchema = require("./0002_members.model.js");

const organizerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    members: {
      type: [memberSchema],
      default: [],
      validate: {
        validator: function (members) {
          const ids = members.map((m) => m.userId.toString());
          return new Set(ids).size === ids.length;
        },
      },
    },
    branding: {
      logoUrl: String,
      primaryColor: String,
    },
    payoutDetails: {
      encrypted: {
        type: String,
        select: false,
      },
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_document, returned) => {
        delete returned.payoutDetails;
        return returned;
      },
    },
  },
);

organizerSchema.index({ "members.userId": 1 });

module.exports = mongoose.model("Organization", organizerSchema);
