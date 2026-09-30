const { fulfillPaidOrder, markPaymentFailed } = require("../services/order.service");
const { processWebhookOnce } = require("../services/webhook.service");
const { handleRefundProcessed, handleRefundFailed } = require("../services/refund.service");

const handleWebhook = async (req,res,next) => {
    try {
        const gateway = req.params.gateway.toUpperCase();
        const event = req.gatewayEvent;
        const payment = event.payload?.payment?.entity;
        const refund = event.payload?.refund?.entity;

        if(event.event === "payment.captured"){
            await processWebhookOnce(gateway,event.id,event.event,() =>
                fulfillPaidOrder(payment.order_id,payment.id,payment.amount),
            );
        }else if(event.event === "payment.failed"){
            await processWebhookOnce(gateway,event.id,event.event,() =>
                markPaymentFailed(payment.order_id),
            );
        }else if(event.event === "refund.processed"){
            await processWebhookOnce(gateway,event.id,event.event,() => 
                handleRefundProcessed(refund),
            );
        }else if(event.event === "refund.failed"){
            await processWebhookOnce(gateway,event.id,event.event,() =>
                handleRefundFailed(refund), 
            )
        }
        res.status(200).json({ received: true });
    } catch (error) {
        next(error);
    }
}

module.exports = handleWebhook;
