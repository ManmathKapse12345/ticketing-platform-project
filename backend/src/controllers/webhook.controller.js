const { fulfillPaidOrder } = require("../services/order.service");
const { processWebhookOnce } = require("../services/webhook.service");

const handleWebhook = async (req,res,next) => {
    try {
        const gateway = req.params.gateway.toUpperCase();
        const event = req.gatewayEvent;
        if(event.type === "payment_intent.succeeded"){
            const paymentIntent = event.data.object;
            await processWebhookOnce(gateway,event.id,event.type,() =>
                fulfillPaidOrder(paymentIntent.metadata.orderId,paymentIntent.id),
            );
        }
        res.status(200).json({ received: true });
    } catch (error) {
        next(error);
    }
}

module.exports = handleWebhook;