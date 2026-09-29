const { verifyWebhookSignature } = require("../utils/razorpay.utils.js");

const verifySignature = async (req,res,next) => {
    try{
        const signature = req.headers["x-razorpay-signature"];
        if(!req.rawBody || !verifyWebhookSignature(req.rawBody, signature)){
            const error = new Error("Invalid webhook signature");
            error.statusCode = 400;
            return next(error);
        }
        // Razorpay sends the unique event id in a header rather than in the body.
        req.gatewayEvent = { ...req.body, id: req.headers["x-razorpay-event-id"] };
        next();
    }catch(error){
        next(error);
    }
}

module.exports = verifySignature;
