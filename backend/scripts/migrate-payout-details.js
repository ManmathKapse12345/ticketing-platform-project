require("dotenv").config();

const mongoose = require("mongoose");
const Organization = require("../src/models/0003_organizer.model.js");
const { encryptSecret } = require("../src/utils/secret.utils.js");

const migrate = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const organizations = await Organization.collection
    .find({ "payoutDetails.bankAccount": { $exists: true } })
    .toArray();

  let migrated = 0;
  for (const organization of organizations) {
    const bankAccount = organization.payoutDetails?.bankAccount;
    if (!bankAccount) continue;

    await Organization.collection.updateOne(
      { _id: organization._id, "payoutDetails.bankAccount": bankAccount },
      {
        $set: {
          "payoutDetails.encrypted": encryptSecret({ bankAccount }),
        },
        $unset: { "payoutDetails.bankAccount": "" },
      },
    );
    migrated += 1;
  }

  console.log(`Migrated ${migrated} organization payout record(s).`);
  await mongoose.disconnect();
};

migrate().catch(async (error) => {
  console.error("Payout migration failed:", error);
  await mongoose.disconnect();
  process.exitCode = 1;
});
