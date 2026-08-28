const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const verifySignature = async (req,res,next) => {
    const signature = req.headers["stripe-signature"];
    let event;
    try{
        event = stripe.webhooks.constructEvent(req.rawBody, signature,process.env.STRIPE_WEBHOOK_SECRET);
        req.gatewayEvent = event;
        next();
    }catch(error){
        error.statusCode = 400;
        next(error);
    }
}

module.exports = verifySignature;