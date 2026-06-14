import type { Response } from "express";

export function initSSE(res: Response): void {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();
  // Disable Nagle so each SSE chunk is sent immediately
  res.socket?.setNoDelay(true);
}

function flushResponse(res: Response): void {
  const resWithFlush = res as Response & { flush?: () => void };
  resWithFlush.flush?.();
}

export function sendSSE(
  res: Response,
  payload: Record<string, unknown>
): void {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
  flushResponse(res);
}

export function sendSSEToken(res: Response, content: string): void {
  sendSSE(res, { type: "token", content });
}

export function sendSSEDone(
  res: Response,
  meta: { messageId: string; createdAt: string; conversationId?: string }
): void {
  sendSSE(res, { type: "done", ...meta });
}

export function sendSSEError(res: Response, error: string): void {
  sendSSE(res, { type: "error", error });
}
