-- Switch payments from Stripe to Razorpay.

-- Stripe payment intent id -> Razorpay order id. Renamed (not dropped) so existing rows keep their value.
ALTER TABLE "Payment" RENAME COLUMN "paymentIntentId" TO "gatewayOrderId";
ALTER INDEX "Payment_paymentIntentId_key" RENAME TO "Payment_gatewayOrderId_key";

-- Razorpay payment id, known only after the customer pays; refunds are issued against it.
ALTER TABLE "Payment" ADD COLUMN "gatewayPaymentId" TEXT;
CREATE UNIQUE INDEX "Payment_gatewayPaymentId_key" ON "Payment"("gatewayPaymentId");

-- New orders are charged in INR.
ALTER TABLE "Order" ALTER COLUMN "currency" SET DEFAULT 'INR';
