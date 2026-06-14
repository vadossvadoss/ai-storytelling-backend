export function logError(context: string, error: unknown): void {
  const bar = "=".repeat(50);
  console.error(`\n${bar}`);
  console.error(`ERROR: ${context}`);
  console.error(bar);

  if (error instanceof Error) {
    console.error("name:   ", error.name);
    console.error("message:", error.message);
    if (error.stack) {
      console.error("stack:\n", error.stack);
    }
    // Anthropic SDK and similar libs attach extra fields
    const extra = error as Error & Record<string, unknown>;
    if (extra.status) console.error("status: ", extra.status);
    if (extra.headers) console.error("headers:", extra.headers);
    if (extra.error) console.error("body:  ", JSON.stringify(extra.error, null, 2));
  } else if (typeof error === "object" && error !== null) {
    console.error("details:", JSON.stringify(error, null, 2));
  } else {
    console.error("raw:   ", error);
  }

  console.error(`${bar}\n`);
}

export function logChatStep(step: string, data?: Record<string, unknown>): void {
  console.log(`[chat] ${step}`, data ? JSON.stringify(data) : "");
}
