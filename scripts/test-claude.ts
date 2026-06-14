import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";

async function main() {
  const key = process.env.ANTHROPIC_API_KEY;

  console.log("=== ENV CHECK ===");
  console.log("ANTHROPIC_API_KEY present:", Boolean(key));
  console.log("ANTHROPIC_API_KEY prefix:", key ? `${key.slice(0, 12)}...` : "N/A");
  console.log("JWT_SECRET present:", Boolean(process.env.JWT_SECRET));

  if (!key) {
    console.error("FAIL: ANTHROPIC_API_KEY not loaded from .env");
    process.exit(1);
  }

  console.log("\n=== CLAUDE API TEST ===");
  const client = new Anthropic({ apiKey: key });

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 64,
      messages: [{ role: "user", content: "Say hello in one word." }],
    });
    const text = response.content.find((b) => b.type === "text");
    console.log("SUCCESS:", text && text.type === "text" ? text.text : response);
  } catch (error) {
    console.error("CLAUDE ERROR:");
    if (error && typeof error === "object") {
      const err = error as { status?: number; message?: string; error?: unknown };
      console.error("  status:", err.status);
      console.error("  message:", err.message);
      console.error("  body:", JSON.stringify(err.error ?? error, null, 2));
    } else {
      console.error(error);
    }
    process.exit(1);
  }

  console.log("\n=== CHAT ENDPOINT (no auth) ===");
  try {
    const res = await fetch("http://localhost:4000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Hello",
        characterId: "char-1",
        conversationId: "mock-char-1-1734567890123",
      }),
    });
    const body = await res.text();
    console.log("  status:", res.status);
    console.log("  body:", body);
  } catch (error) {
    console.error("  fetch failed:", error);
  }
}

main();
