const { createOrderSchema } = require("../validators/order.validator.js");
const {
  createOrder,
  getOrder,
  getAllOrder,
  paymentIntent,
  listOrganizationOrders,
  getOrganizationOrder,
} = require("../services/order.service.js");

const createOrderRequest = async (req, res, next) => {
  try {
    const parsed = createOrderSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, errors: parsed.error.flatten() });
    }
    const { requestedItems, idempotencyKey } = parsed.data;
    const { eventId, organizationId } = req.params;

    const order = await createOrder(
      req.user._id,
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
    const order = await getOrder(req.params.orderId, req.user._id);
    return res.status(200).json({ success: true, order });
  } catch (error) {
    next(error);
  }
};

const getAllOrderRequest = async (req, res, next) => {
  try {
    const orders = await getAllOrder(req.user._id);
    return res.status(200).json({ success: true, orders });
  } catch (error) {
    next(error);
  }
};

const paymentIntentRequest = async (req, res, next) => {
  try{
    const { orderId } = req.params;
    const clientSecret = await paymentIntent(orderId,req.user._id);
    return res.status(200).json({success:true, clientSecret: clientSecret});
  }catch(error){
    next(error);
  }
}

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
  paymentIntentRequest,
  listOrganizationOrdersRequest,
  getOrganizationOrderRequest,
};
