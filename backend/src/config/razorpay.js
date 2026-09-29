const Razorpay = require("razorpay");

let client;

// Created on first use: the Razorpay constructor throws when key_id is missing,
// which would otherwise crash the whole app at startup before keys are configured.
const getRazorpay = () => {
    if (!client) {
        client = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
        });
    }
    return client;
};

module.exports = getRazorpay;
