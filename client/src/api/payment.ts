export type PaymentInfo = {
  provider: string;
  amountRub: string;
  currency: string;
  configured: boolean;
};

export async function getPaymentInfo(): Promise<PaymentInfo> {
  const res = await fetch("/payments/info");
  if (!res.ok) {
    throw new Error("payment_info_unavailable");
  }
  return res.json() as Promise<PaymentInfo>;
}

export async function createYooKassaPayment(): Promise<{ paymentId: string; confirmationUrl: string }> {
  const res = await fetch("/payments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  const body = (await res.json().catch(() => ({}))) as {
    error?: string;
    message?: string;
    paymentId?: string;
    confirmationUrl?: string;
  };
  if (!res.ok) {
    throw new Error(typeof body.message === "string" ? body.message : "payment_create_failed");
  }
  if (!body.paymentId || !body.confirmationUrl) {
    throw new Error("payment_create_invalid");
  }
  return { paymentId: body.paymentId, confirmationUrl: body.confirmationUrl };
}

export async function getPaymentStatus(paymentId: string): Promise<{
  paymentId: string;
  status: string;
  paid: boolean;
  exportAllowed: boolean;
}> {
  const res = await fetch(`/payments/${encodeURIComponent(paymentId)}/status`);
  const body = (await res.json().catch(() => ({}))) as {
    error?: string;
    exportAllowed?: boolean;
    paid?: boolean;
    status?: string;
    paymentId?: string;
  };
  if (!res.ok) {
    throw new Error(typeof body.error === "string" ? body.error : "payment_status_failed");
  }
  return body as {
    paymentId: string;
    status: string;
    paid: boolean;
    exportAllowed: boolean;
  };
}
