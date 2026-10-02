const { createOrderSchema, verifyPaymentSchema } = require("../validators/order.validator.js");
const {
  createOrder,
  getOrder,
  getAllOrder,
  createCheckout,
  verifyCheckoutPayment,
  listOrganizationOrders,
  getOrganizationOrder,
} = require("../services/order.service.js");
const { getOrderTicketsPdf } = require("../services/ticketDelivery.service.js");

const createOrderRequest = async (req, res, next) => {
  try {
    const parsed = createOrderSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, errors: parsed.error.flatten() });
    }
    const { requestedItems, idempotencyKey } = parsed.data;
    const { eventId, organizationId } = req.params;

    const order = await createOrder(
      req.user.id,
      organizationId,
      eventId,
      requestedItems,
      idempotencyKey,
    );
    return res.status(201).json({ success: true, order });
  } catch (error) {
    next(error);
  }
};

const getOrderRequest = async (req, res, next) => {
  try {
    const order = await getOrder(req.params.orderId, req.user.id);
    return res.status(200).json({ success: true, order });
  } catch (error) {
    next(error);
  }
};

const getAllOrderRequest = async (req, res, next) => {
  try {
    const orders = await getAllOrder(req.user.id);
    return res.status(200).json({ success: true, orders });
  } catch (error) {
    next(error);
  }
};

const checkoutRequest = async (req, res, next) => {
  try{
    const { orderId } = req.params;
    const checkout = await createCheckout(orderId,req.user.id);
    return res.status(200).json({success:true, checkout});
  }catch(error){
    next(error);
  }
}

const verifyPaymentRequest = async (req, res, next) => {
  try{
    const parsed = verifyPaymentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, errors: parsed.error.flatten() });
    }
    const order = await verifyCheckoutPayment(req.params.orderId, req.user.id, parsed.data);
    return res.status(200).json({ success: true, order });
  }catch(error){
    next(error);
  }
}

const downloadTicketsPdfRequest = async (req, res, next) => {
  try {
    const { pdf, filename } = await getOrderTicketsPdf(req.params.orderId, req.user.id);
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    });
    return res.status(200).send(pdf);
  } catch (error) {
    next(error);
  }
};

const listOrganizationOrdersRequest = async (req, res, next) => {
  try {
    const orders = await listOrganizationOrders(req.params.organizationId);
    return res.status(200).json({ success: true, orders });
  } catch (error) {
    next(error);
  }
};

const getOrganizationOrderRequest = async (req, res, next) => {
  try {
    const order = await getOrganizationOrder(req.params.organizationId, req.params.orderId);
    return res.status(200).json({ success: true, order });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOrderRequest,
  getOrderRequest,
  getAllOrderRequest,
  checkoutRequest,
  verifyPaymentRequest,
  downloadTicketsPdfRequest,
  listOrganizationOrdersRequest,
  getOrganizationOrderRequest,
};
