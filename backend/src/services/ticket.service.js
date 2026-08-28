const Ticket = require("../models/0007_ticket.model.js");
const ApiError = require("../utils/apiError.js");
const { verifyTicketQr } = require("../utils/qr.utils.js");

const checkInTicket = async (organizationId,eventId,qrCode) => {
    let decoded;
    try {
        decoded = verifyTicketQr(qrCode);
    } catch (error) {
        throw new ApiError(400,"Invalid or expired QR code");
    }

    if(decoded.eventId !== eventId){
        throw new ApiError(400,"This ticket is not valid for this event");
    }

    const ticket = await Ticket.findOneAndUpdate(
        { _id: decoded.ticketId, eventId, organizationId, status: "active"},
        { $set: { status: "used" } },
        { new: true },
    );

    if(!ticket){
        const existing = await Ticket.findOne({ _id: decoded.ticketId, eventId, organizationId });
        if(!existing)  throw new ApiError(404, "Ticket not found for this event");
        throw new ApiError(409, `Ticket already ${existing.status}`);
    }

    return ticket;
}

const getSpecificTicket = async (ticketId, userId) => {
    const ticket = await Ticket.findOne({ _id: ticketId, ownerUserId: userId });
    if(!ticket)  throw new ApiError(404,"ticket doesn't exists");
    return ticket;
}

const getAllTicket = async (userId) => {
    const tickets = await Ticket.find({ownerUserId:userId});
    if(!tickets)  throw new ApiError(400,"User haven't purchased any ticket");
    return tickets;
}

const listEventTickets = (eventId, organizationId) =>
    Ticket.find({ eventId, organizationId }).sort({ createdAt: 1 });

module.exports = { getSpecificTicket, getAllTicket, checkInTicket, listEventTickets }