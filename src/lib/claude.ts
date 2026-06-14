import Anthropic from "@anthropic-ai/sdk";
import { logError } from "./log-error.js";
import { delayBeforeToken, splitForTyping, getTypingDelayRange } from "./typing-delay.js";

const MODEL = "claude-sonnet-4-6";

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }
  return new Anthropic({ apiKey });
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface StreamResponseOptions {
  systemPrompt: string;
  messages: ChatMessage[];
  maxTokens?: number;
  onToken: (token: string) => void;
}

export async function streamResponse(
  options: StreamResponseOptions
): Promise<string> {
  const { systemPrompt, messages, maxTokens = 1024, onToken } = options;
  const client = getClient();

  const { min, max } = getTypingDelayRange();
  console.log("[claude] Streaming — model:", MODEL, "messages:", messages.length);
  console.log(`[claude] human typing delay: ${min}–${max}ms per word`);

  try {
    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    let fullText = "";

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        const token = event.delta.text;
        fullText += token;

        for (const chunk of splitForTyping(token)) {
          await delayBeforeToken(chunk);
          onToken(chunk);
        }
      }
    }

    if (!fullText) {
      throw new Error("No text response from Claude");
    }

    return fullText;
  } catch (error) {
    logError("Claude API stream", error);
    throw error;
  }
}
