const prisma = require("../config/prisma.js");
const { findEventForOrganization } = require("./ownership.service.js");

// Days are bucketed in the organizers' local time, not UTC.
const REPORT_TIME_ZONE = "Asia/Kolkata";

// null (not 0) when there's nothing to divide by: "no data" isn't "0%".
const ratio = (numerator, denominator) =>
  denominator ? Math.round((numerator / denominator) * 10000) / 10000 : null;

// Gross counts every captured payment, even ones later refunded in full; refunds
// count only once APPROVED (Payment.refundedMinor also holds in-flight refunds).
const getRevenue = async (eventId, organizationId) => {
  const [gross, refunded] = await Promise.all([
    prisma.payment.aggregate({
      where: { organizationId, order: { eventId }, status: { in: ["SUCCESS", "REFUNDED"] } },
      _sum: { amountMinor: true },
      _count: true,
    }),
    prisma.refund.aggregate({
      where: { organizationId, status: "APPROVED", payment: { order: { eventId } } },
      _sum: { amountMinor: true },
    }),
  ]);

  const grossMinor = gross._sum.amountMinor ?? 0;
  const refundedMinor = refunded._sum.amountMinor ?? 0;
  return {
    grossMinor,
    refundedMinor,
    netMinor: grossMinor - refundedMinor,
    paidOrders: gross._count,
  };
};

// Sold = seats on PAID orders. TicketTier.quantitySold also counts pending
// reservations, so it can't be used here.
const getTicketsByTier = async (eventId, organizationId) => {
  const [sales, tiers] = await Promise.all([
    prisma.orderItem.groupBy({
      by: ["ticketTierId"],
      where: { eventId, order: { organizationId, paymentStatus: "PAID" } },
      _sum: { quantity: true, subtotalMinor: true },
    }),
    prisma.ticketTier.findMany({
      where: { eventId, organizationId },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const salesByTier = new Map(sales.map((row) => [row.ticketTierId, row._sum]));
  return tiers.map((tier) => {
    const sold = salesByTier.get(tier.id)?.quantity ?? 0;
    return {
      tierId: tier.id,
      name: tier.name,
      priceMinor: tier.priceMinor,
      quantityTotal: tier.quantityTotal,
      sold,
      revenueMinor: salesByTier.get(tier.id)?.subtotalMinor ?? 0,
      sellThroughRate: ratio(sold, tier.quantityTotal),
    };
  });
};

// groupBy can't group by "day of a timestamp", so this one is raw SQL.
// "paidAt" is a UTC timestamp without zone: AT TIME ZONE 'UTC' marks it as UTC,
// the second AT TIME ZONE converts it to local wall-clock time.
const getDailySales = async (eventId, organizationId, { from, to }) => {
  const rows = await prisma.$queryRaw`
    SELECT to_char(
             date_trunc('day', (o."paidAt" AT TIME ZONE 'UTC') AT TIME ZONE ${REPORT_TIME_ZONE}),
             'YYYY-MM-DD') AS day,
           COUNT(DISTINCT o.id)    AS orders,
           SUM(oi.quantity)        AS tickets,
           SUM(oi."subtotalMinor") AS "revenueMinor"
    FROM "Order" o
    JOIN "OrderItem" oi ON oi."orderId" = o.id
    WHERE o."eventId" = ${eventId}::uuid
      AND o."organizationId" = ${organizationId}::uuid
      AND o."paymentStatus" IN ('PAID', 'REFUNDED')
      AND o."paidAt" >= ${from} AND o."paidAt" <= ${to}
    GROUP BY 1
    ORDER BY 1`;

  // COUNT/SUM come back as BigInt, which res.json can't serialise.
  return rows.map((row) => ({
    day: row.day,
    orders: Number(row.orders),
    tickets: Number(row.tickets),
    revenueMinor: Number(row.revenueMinor),
  }));
};

// Cancelled tickets aren't expected at the door, so they're left out of the rate.
const getAttendance = async (eventId, organizationId) => {
  const rows = await prisma.ticket.groupBy({
    by: ["status"],
    where: { eventId, organizationId },
    _count: true,
  });

  const byStatus = Object.fromEntries(rows.map((row) => [row.status, row._count]));
  const checkedIn = byStatus.used ?? 0;
  const issued = (byStatus.active ?? 0) + checkedIn;
  return {
    issued,
    checkedIn,
    cancelled: byStatus.cancelled ?? 0,
    attendanceRate: ratio(checkedIn, issued),
  };
};

const getEventAnalytics = async (eventId, organizationId, range) => {
  const event = await findEventForOrganization(eventId, organizationId);

  const [revenue, tiers, dailySales, attendance] = await Promise.all([
    getRevenue(eventId, organizationId),
    getTicketsByTier(eventId, organizationId),
    getDailySales(eventId, organizationId, range),
    getAttendance(eventId, organizationId),
  ]);

  return {
    event: { id: event.id, title: event.title, status: event.status, startDate: event.startDate },
    revenue,
    tiers,
    dailySales,
    attendance,
    traffic: {
      views: event.viewCount,
      paidOrders: revenue.paidOrders,
      conversionRate: ratio(revenue.paidOrders, event.viewCount),
    },
  };
};

// One row per event in the organization, for a dashboard overview.
const getOrganizationOverview = async (organizationId) => {
  const [events, grossRows, refundRows] = await Promise.all([
    prisma.event.findMany({
      where: { organizationId },
      orderBy: { startDate: "asc" },
      select: { id: true, title: true, status: true, startDate: true, viewCount: true },
    }),
    prisma.$queryRaw`
      SELECT o."eventId", SUM(p."amountMinor") AS "grossMinor", COUNT(*) AS "paidOrders"
      FROM "Payment" p
      JOIN "Order" o ON o.id = p."orderId"
      WHERE p."organizationId" = ${organizationId}::uuid
        AND p.status IN ('SUCCESS', 'REFUNDED')
      GROUP BY o."eventId"`,
    prisma.$queryRaw`
      SELECT o."eventId", SUM(r."amountMinor") AS "refundedMinor"
      FROM "Refund" r
      JOIN "Payment" p ON p.id = r."paymentId"
      JOIN "Order" o ON o.id = p."orderId"
      WHERE r."organizationId" = ${organizationId}::uuid
        AND r.status = 'APPROVED'
      GROUP BY o."eventId"`,
  ]);

  const grossByEvent = new Map(grossRows.map((row) => [row.eventId, row]));
  const refundedByEvent = new Map(refundRows.map((row) => [row.eventId, row.refundedMinor]));

  const rows = events.map((event) => {
    const gross = grossByEvent.get(event.id);
    const grossMinor = Number(gross?.grossMinor ?? 0);
    const refundedMinor = Number(refundedByEvent.get(event.id) ?? 0);
    const paidOrders = Number(gross?.paidOrders ?? 0);
    return {
      eventId: event.id,
      title: event.title,
      status: event.status,
      startDate: event.startDate,
      grossMinor,
      refundedMinor,
      netMinor: grossMinor - refundedMinor,
      paidOrders,
      views: event.viewCount,
      conversionRate: ratio(paidOrders, event.viewCount),
    };
  });

  const totals = rows.reduce(
    (sum, row) => ({
      grossMinor: sum.grossMinor + row.grossMinor,
      refundedMinor: sum.refundedMinor + row.refundedMinor,
      netMinor: sum.netMinor + row.netMinor,
      paidOrders: sum.paidOrders + row.paidOrders,
    }),
    { grossMinor: 0, refundedMinor: 0, netMinor: 0, paidOrders: 0 },
  );

  return { totals, events: rows };
};

module.exports = {
  getRevenue,
  getTicketsByTier,
  getDailySales,
  getAttendance,
  getEventAnalytics,
  getOrganizationOverview,
};
