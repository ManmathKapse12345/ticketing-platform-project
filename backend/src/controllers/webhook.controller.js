const { fulfillPaidOrder, markPaymentFailed } = require("../services/order.service");
const { processWebhookOnce } = require("../services/webhook.service");

const handleWebhook = async (req,res,next) => {
    try {
        const gateway = req.params.gateway.toUpperCase();
        const event = req.gatewayEvent;
        const payment = event.payload?.payment?.entity;

        if(event.event === "payment.captured"){
            await processWebhookOnce(gateway,event.id,event.event,() =>
                fulfillPaidOrder(payment.order_id,payment.id,payment.amount),
            );
        }else if(event.event === "payment.failed"){
            await processWebhookOnce(gateway,event.id,event.event,() =>
                markPaymentFailed(payment.order_id),
            );
        }
        res.status(200).json({ received: true });
    } catch (error) {
        next(error);
    }
}

module.exports = handleWebhook;
