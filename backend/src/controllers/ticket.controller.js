const { checkInTicketSchema } = require("../validators/ticket.validator.js");
const { checkInTicket, getAllTicket, getSpecificTicket, listEventTickets } = require("../services/ticket.service.js");

const getAllTicketRequest = async(req,res,next) => {
    try {
        const userId = req.user.id;
        const tickets = await getAllTicket(userId);
        return res.status(200).json({tickets});
    } catch (error) {
        next(error);
    }
}

const getSpecificTicketRequest = async(req,res,next) => {
    try {
        const { ticketId }= req.params;
        const ticket = await getSpecificTicket(ticketId, req.user.id);
        return res.status(200).json({ticket});
    } catch (error) {
        next(error);
    }
}

const checkInTicketRequest = async (req,res,next) => {
    try {
        const { organizationId, eventId } = req.params;
        const parsed = checkInTicketSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ success: false, errors: parsed.error.flatten() });
        }
        const { qrCode } = parsed.data;

        const ticket = await checkInTicket(organizationId,eventId,qrCode);
        return res.status(200).json({ success:true, message:"Checked in", ticket});
    } catch (error) {
        next(error);
    }
};

const listEventTicketsRequest = async (req, res, next) => {
    try {
        const { organizationId, eventId } = req.params;
        const tickets = await listEventTickets(eventId, organizationId);
        return res.status(200).json({ success: true, tickets });
    } catch (error) {
        next(error);
    }
}

module.exports = { checkInTicketRequest, getAllTicketRequest, getSpecificTicketRequest, listEventTicketsRequest };