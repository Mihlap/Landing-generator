import type { Response } from "express";

export type ApiErrorPayload = {
  error: {
    code: string;
    message: string;
    retryable: boolean;
    requestId?: string;
  };
};

export function sendApiError(
  res: Response,
  status: number,
  code: string,
  message: string,
  retryable: boolean,
): void {
  const requestId = res.locals?.requestId;
  const payload: ApiErrorPayload = {
    error: {
      code,
      message,
      retryable,
      ...(typeof requestId === "string" && requestId ? { requestId } : {}),
    },
  };
  res.status(status).json(payload);
}

