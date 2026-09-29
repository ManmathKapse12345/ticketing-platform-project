const prisma = require("../config/prisma.js");
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

    // "status: active" in the filter makes this an atomic claim, so the same
    // ticket can't be checked in twice by two scanners at once.
    const { count } = await prisma.ticket.updateMany({
        where: { id: decoded.ticketId, eventId, organizationId, status: "active" },
        data: { status: "used" },
    });

    const ticket = await prisma.ticket.findFirst({
        where: { id: decoded.ticketId, eventId, organizationId },
    });

    if(count === 0){
        if(!ticket)  throw new ApiError(404, "Ticket not found for this event");
        throw new ApiError(409, `Ticket already ${ticket.status}`);
    }

    return ticket;
}

const getSpecificTicket = async (ticketId, userId) => {
    const ticket = await prisma.ticket.findFirst({ where: { id: ticketId, ownerUserId: userId } });
    if(!ticket)  throw new ApiError(404,"ticket doesn't exists");
    return ticket;
}

const getAllTicket = (userId) =>
    prisma.ticket.findMany({ where: { ownerUserId: userId } });

const listEventTickets = (eventId, organizationId) =>
    prisma.ticket.findMany({
        where: { eventId, organizationId },
        orderBy: { createdAt: "asc" },
    });

module.exports = { getSpecificTicket, getAllTicket, checkInTicket, listEventTickets }
