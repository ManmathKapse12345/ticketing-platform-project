const express = require("express");
const verifyToken = require("../middleware/verifyToken.middleware");
const authorize = require("../middleware/requireRole.middleware");
const { getAllTicketRequest, getSpecificTicketRequest } = require("../controllers/ticket.controller");
const validateObjectId = require("../middleware/validateObjectId.middleware");
const router = express.Router();

const CUSTOMER_UP = ["customer","platformAdmin"];
router.use(verifyToken);

router.get(
    "/",
    authorize(...CUSTOMER_UP),
    getAllTicketRequest,
);

router.get(
    "/:ticketId",
    validateObjectId("ticketId"),
    authorize(...CUSTOMER_UP),
    getSpecificTicketRequest,
);

module.exports = router;