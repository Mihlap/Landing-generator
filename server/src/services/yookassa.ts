import { randomUUID } from "node:crypto";

const YOOKASSA_API = "https://api.yookassa.ru/v3";

export type YooKassaCredentials = { shopId: string; secretKey: string };

export function getYooKassaCredentials(): YooKassaCredentials | null {
  const shopId = process.env.YOOKASSA_SHOP_ID?.trim() ?? "";
  const secretKey = process.env.YOOKASSA_SECRET_KEY?.trim() ?? "";
  if (!shopId || !secretKey) return null;
  return { shopId, secretKey };
}

function basicAuth({ shopId, secretKey }: YooKassaCredentials): string {
  const token = Buffer.from(`${shopId}:${secretKey}`, "utf8").toString("base64");
  return `Basic ${token}`;
}

export function getExportPriceRub(): string {
  const v = process.env.EXPORT_PRICE_RUB?.trim();
  if (v && /^\d+(\.\d{1,2})?$/.test(v)) return v.includes(".") ? v : `${v}.00`;
  return "390.00";
}

export function getClientPublicUrl(): string {
  const u = process.env.CLIENT_PUBLIC_URL?.trim();
  if (u) return u.replace(/\/$/, "");
  return "http://localhost:5173";
}

type CreatePaymentResult = { id: string; confirmationUrl: string };

export async function createRedirectPayment(params: {
  returnUrl: string;
  description: string;
}): Promise<CreatePaymentResult> {
  const cred = getYooKassaCredentials();
  if (!cred) {
    throw new Error("YOOKASSA_NOT_CONFIGURED");
  }

  const amount = getExportPriceRub();
  const idempotenceKey = randomUUID();

  const res = await fetch(`${YOOKASSA_API}/payments`, {
    method: "POST",
    headers: {
      Authorization: basicAuth(cred),
      "Idempotence-Key": idempotenceKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: { value: amount, currency: "RUB" },
      capture: true,
      confirmation: {
        type: "redirect",
        return_url: params.returnUrl,
      },
      description: params.description,
      metadata: { purpose: "html_export" },
    }),
  });

  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    const msg =
      typeof data.description === "string"
        ? data.description
        : typeof data.type === "string"
          ? data.type
          : `HTTP ${res.status}`;
    throw new Error(msg);
  }

  const id = typeof data.id === "string" ? data.id : "";
  const confirmation = data.confirmation as Record<string, unknown> | undefined;
  const confirmationUrl =
    typeof confirmation?.confirmation_url === "string" ? confirmation.confirmation_url : "";

  if (!id || !confirmationUrl) {
    throw new Error("invalid_yookassa_response");
  }

  return { id, confirmationUrl };
}

export type PaymentStatusPayload = {
  id: string;
  status: string;
  paid: boolean;
};

export async function fetchPaymentStatus(paymentId: string): Promise<PaymentStatusPayload | null> {
  const cred = getYooKassaCredentials();
  if (!cred) return null;

  const res = await fetch(`${YOOKASSA_API}/payments/${encodeURIComponent(paymentId)}`, {
    headers: {
      Authorization: basicAuth(cred),
      "Content-Type": "application/json",
    },
  });

  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok) return null;

  const id = typeof data.id === "string" ? data.id : "";
  const status = typeof data.status === "string" ? data.status : "";
  const paid = data.paid === true;

  if (!id) return null;
  return { id, status, paid };
}

export async function isPaymentSucceededForExport(paymentId: string): Promise<boolean> {
  const p = await fetchPaymentStatus(paymentId.trim());
  if (!p) return false;
  return p.paid === true && p.status === "succeeded";
}
