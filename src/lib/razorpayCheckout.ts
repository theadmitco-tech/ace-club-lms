// The subset of the browser Checkout API used by the registration page.
// Payment verification remains a server responsibility.
export interface RazorpayPaymentResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayFailureResponse {
  error?: { description?: string; reason?: string };
}

interface RazorpayCheckoutOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill: { name: string; email: string; contact: string };
  theme: { color: string };
  handler: (response: RazorpayPaymentResponse) => void | Promise<void>;
  modal: { ondismiss: () => void };
}

interface RazorpayCheckoutInstance {
  open(): void;
  on(event: 'payment.failed', handler: (response: RazorpayFailureResponse) => void): void;
}

export type RazorpayCheckoutConstructor = new (options: RazorpayCheckoutOptions) => RazorpayCheckoutInstance;
