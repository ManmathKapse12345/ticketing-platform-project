require("dotenv").config();

const mongoose = require("mongoose");
const TicketTier = require("../src/models/0005_ticketTier.model.js");
const Order = require("../src/models/0006_order.model.js");
const Payment = require("../src/models/0008_payment.model.js");
const Refund = require("../src/models/0009_refund.model.js");

const toMinorUnits = (value) => {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`Invalid monetary value: ${value}`);
  }
  return Math.round(value * 100);
};

const renameMoneyField = async (collection, oldField, newField) => {
  const documents = await collection
    .find({ [oldField]: { $exists: true } })
    .toArray();

  for (const document of documents) {
    await collection.updateOne(
      { _id: document._id, [oldField]: document[oldField] },
      {
        $set: { [newField]: toMinorUnits(document[oldField]) },
        $unset: { [oldField]: "" },
      },
    );
  }

  return documents.length;
};

const migrate = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const counts = {};

  counts.ticketTiers = await renameMoneyField(
    TicketTier.collection,
    "price",
    "priceMinor",
  );
  counts.payments = await renameMoneyField(
    Payment.collection,
    "amount",
    "amountMinor",
  );
  counts.refunds = await renameMoneyField(
    Refund.collection,
    "amount",
    "amountMinor",
  );
  counts.ordersSubtotal = await renameMoneyField(
    Order.collection,
    "subtotal",
    "subtotalMinor",
  );
  counts.ordersFees = await renameMoneyField(
    Order.collection,
    "fees",
    "feesMinor",
  );
  counts.ordersTotal = await renameMoneyField(
    Order.collection,
    "totalAmount",
    "totalAmountMinor",
  );

  const orders = await Order.collection
    .find({
      items: {
        $elemMatch: {
          $or: [
            { unitPrice: { $exists: true } },
            { subtotal: { $exists: true } },
          ],
        },
      },
    })
    .toArray();
  for (const order of orders) {
    const items = order.items.map((item) => ({
      ...item,
      unitPriceMinor: item.unitPriceMinor ?? toMinorUnits(item.unitPrice),
      subtotalMinor: item.subtotalMinor ?? toMinorUnits(item.subtotal),
    }));
    items.forEach((item) => {
      delete item.unitPrice;
      delete item.subtotal;
    });
    await Order.collection.updateOne({ _id: order._id }, { $set: { items } });
  }

  console.log("Money migration complete:", counts);
  await mongoose.disconnect();
};

migrate().catch(async (error) => {
  console.error("Money migration failed:", error);
  await mongoose.disconnect();
  process.exitCode = 1;
});
