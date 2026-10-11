import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { RazorpaySuccess } from "@/lib/razorpay";
import type { Checkout, Order, Ticket } from "./types";

export function useOrders() {
  return useQuery({
    queryKey: ["orders"],
    queryFn: () => api.get<{ orders: Order[] }>("/orders").then((r) => r.data.orders),
  });
}

/** pollWhilePending: after paying, refetch every 2s until the order turns PAID (webhook path) */
export function useOrder(orderId: string, { pollWhilePending = false } = {}) {
  return useQuery({
    queryKey: ["orders", orderId],
    queryFn: () => api.get<{ order: Order }>(`/orders/${orderId}`).then((r) => r.data.order),
    refetchInterval: (q) =>
      pollWhilePending && q.state.data?.paymentStatus === "PENDING" ? 2000 : false,
    retry: false,
  });
}

export function useTickets({ enabled = true } = {}) {
  return useQuery({
    queryKey: ["tickets"],
    queryFn: () => api.get<{ tickets: Ticket[] }>("/tickets").then((r) => r.data.tickets),
    enabled,
  });
}

export function useTicket(ticketId: string) {
  return useQuery({
    queryKey: ["tickets", ticketId],
    queryFn: () => api.get<{ ticket: Ticket }>(`/tickets/${ticketId}`).then((r) => r.data.ticket),
    retry: false,
  });
}

export const createOrder = (
  organizationId: string,
  eventId: string,
  requestedItems: { ticketTier: string; quantity: number }[],
  idempotencyKey: string,
) =>
  api
    .post<{ order: Order }>(`/organization/${organizationId}/events/${eventId}/orders`, {
      requestedItems,
      idempotencyKey,
    })
    .then((r) => r.data.order);

export const startCheckout = (orderId: string) =>
  api.post<{ checkout: Checkout }>(`/orders/${orderId}/checkout`).then((r) => r.data.checkout);

export const verifyPayment = (orderId: string, r: RazorpaySuccess) =>
  api.post(`/orders/${orderId}/verify-payment`, {
    razorpayOrderId: r.razorpay_order_id,
    razorpayPaymentId: r.razorpay_payment_id,
    razorpaySignature: r.razorpay_signature,
  });

/** The PDF needs the Bearer token, so a plain <a href> won't work. Fetch it as a blob instead. */
export async function downloadTicketsPdf(orderId: string) {
  const res = await api.get<Blob>(`/orders/${orderId}/tickets/pdf`, { responseType: "blob" });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = `tickets-${orderId.slice(0, 8)}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

export const cancelOrder = (orderId: string) => api.post(`/orders/${orderId}/cancel`);
