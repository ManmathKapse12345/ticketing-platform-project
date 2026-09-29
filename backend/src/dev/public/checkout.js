// Walks the real API the same way a frontend would:
// login -> create order -> /checkout -> Razorpay Checkout popup -> /verify-payment.
const $ = (id) => document.getElementById(id);
let accessToken = null;
let events = [];

const log = (label, data) => {
  const line = `[${new Date().toLocaleTimeString()}] ${label}` +
    (data === undefined ? "" : `\n${JSON.stringify(data, null, 2)}`);
  $("log").textContent = `${line}\n\n${$("log").textContent}`;
};

const setStatus = (id, message, kind = "") => {
  $(id).textContent = message;
  $(id).className = `status ${kind}`;
};

const api = async (method, path, body) => {
  const res = await fetch(path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
    },
    credentials: "same-origin",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  log(`${method} ${path} -> ${res.status}`, data);
  if (!res.ok) {
    throw new Error(data.message || data.error || `${method} ${path} failed (${res.status})`);
  }
  return data;
};

const rupees = (minor) => `₹${(minor / 100).toFixed(2)}`;

const loadTiers = async () => {
  const eventId = $("event").value;
  const { tiers } = await api("GET", `/api/events/${eventId}/tiers`);
  $("tier").innerHTML = tiers
    .map((t) => `<option value="${t.id}">${t.name} — ${rupees(t.priceMinor)} (${t.quantityTotal - t.quantitySold} left)</option>`)
    .join("");
};

const loadEvents = async () => {
  ({ events } = await api("GET", "/api/events"));
  if (events.length === 0) {
    setStatus("buy-status", "No published events. Run: npm run seed:dev", "err");
    return;
  }
  $("event").innerHTML = events
    .map((e) => `<option value="${e.id}">${e.title}</option>`)
    .join("");
  await loadTiers();
};

$("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    const data = await api("POST", "/api/auth/login", {
      email: $("email").value,
      password: $("password").value,
    });
    accessToken = data.accessToken;
    setStatus("login-status", `Logged in as ${data.user.email}`, "ok");
    $("step-buy").hidden = false;
    await loadEvents();
  } catch (error) {
    setStatus("login-status", error.message, "err");
  }
});

$("event").addEventListener("change", () => loadTiers().catch((e) => setStatus("buy-status", e.message, "err")));

const showResult = async (orderId) => {
  const { order } = await api("GET", `/api/orders/${orderId}`);
  const { tickets } = await api("GET", "/api/tickets");
  const orderTickets = tickets.filter((t) => t.orderId === orderId);

  $("step-result").hidden = false;
  $("result").innerHTML = `
    <dt>Order</dt><dd>${order.id}</dd>
    <dt>Status</dt><dd><b>${order.paymentStatus}</b></dd>
    <dt>Total</dt><dd>${rupees(order.totalAmountMinor)} ${order.currency}</dd>
    <dt>Tickets</dt><dd>${orderTickets.length}</dd>`;
  $("tickets").innerHTML = orderTickets
    .map((t) => `<div class="ticket"><b>Ticket ${t.id}</b> · ${t.status}<br><span class="muted">QR: ${t.qrCode}</span></div>`)
    .join("");
};

$("pay").addEventListener("click", async () => {
  $("pay").disabled = true;
  setStatus("buy-status", "Creating order…");
  try {
    const event = events.find((ev) => ev.id === $("event").value);
    const { order } = await api(
      "POST",
      `/api/organization/${event.organizationId}/events/${event.id}/orders`,
      {
        requestedItems: [{ ticketTier: $("tier").value, quantity: Number($("quantity").value) }],
        idempotencyKey: crypto.randomUUID(),
      },
    );

    const { checkout } = await api("POST", `/api/orders/${order.id}/checkout`);

    const razorpay = new Razorpay({
      key: checkout.keyId,
      order_id: checkout.razorpayOrderId,
      amount: checkout.amount,
      currency: checkout.currency,
      name: "Ticketing Platform (test)",
      description: `Order ${order.id}`,
      prefill: { email: $("email").value, contact: "9999999999" },
      theme: { color: "#2563eb" },
      handler: async (response) => {
        log("Razorpay Checkout success", response);
        setStatus("buy-status", "Payment done — verifying with backend…");
        try {
          await api("POST", `/api/orders/${order.id}/verify-payment`, {
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          });
          setStatus("buy-status", "Verified — order is PAID and tickets were issued.", "ok");
          await showResult(order.id);
        } catch (error) {
          setStatus("buy-status", `Verify failed: ${error.message}`, "err");
        } finally {
          $("pay").disabled = false;
          loadTiers().catch(() => {});
        }
      },
      modal: {
        ondismiss: () => {
          setStatus("buy-status", "Checkout closed without paying. The order stays PENDING and expires in 15 minutes.", "err");
          $("pay").disabled = false;
        },
      },
    });

    razorpay.on("payment.failed", (response) => {
      log("Razorpay Checkout payment.failed", response.error);
      setStatus("buy-status", `Payment failed: ${response.error.description}`, "err");
    });

    setStatus("buy-status", "Razorpay Checkout opened…");
    razorpay.open();
  } catch (error) {
    setStatus("buy-status", error.message, "err");
    $("pay").disabled = false;
  }
});
