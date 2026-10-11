export interface RazorpaySuccess {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayOptions {
  key: string;
  order_id: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  prefill?: { name?: string; email?: string };
  theme?: { color?: string };
  handler: (response: RazorpaySuccess) => void;
  modal?: { ondismiss?: () => void };
}

interface RazorpayInstance {
  open(): void;
  on(event: "payment.failed", cb: (response: { error: { description: string } }) => void): void;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

export class PaymentCancelled extends Error {
  constructor() {
    super("Checkout closed");
    this.name = "PaymentCancelled";
  }
}

let scriptPromise: Promise<void> | null = null;

function loadRazorpay(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  scriptPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null; // allow a retry
      reject(new Error("Couldn't load Razorpay. Check your connection."));
    };
    document.body.appendChild(script);
  });
  return scriptPromise;
}

/**
 * Opens Razorpay Checkout. Resolves with the payment details on success.
 * Rejects with PaymentCancelled if the user closes the popup, or with the
 * last failure reason if a payment failed and they then closed it.
 */
export async function payWithRazorpay(
  options: Omit<RazorpayOptions, "handler" | "modal">,
): Promise<RazorpaySuccess> {
  await loadRazorpay();
  return new Promise((resolve, reject) => {
    let lastError: string | null = null;
    const rzp = new window.Razorpay!({
      ...options,
      handler: resolve,
      modal: { ondismiss: () => reject(lastError ? new Error(lastError) : new PaymentCancelled()) },
    });
    rzp.on("payment.failed", (r) => {
      lastError = r.error.description;
    });
    rzp.open();
  });
}
