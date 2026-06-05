import Anthropic from "@anthropic-ai/sdk";

const client = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface GenerateResponseOptions {
  systemPrompt?: string;
  messages: ChatMessage[];
  maxTokens?: number;
}

export async function generateResponse(
  options: GenerateResponseOptions
): Promise<string> {
  const { systemPrompt, messages, maxTokens = 1024 } = options;

  if (!client) {
    const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
    return `[Mock response] I heard you say: "${lastUserMessage?.content ?? "..."}". Connect ANTHROPIC_API_KEY to get real AI responses.`;
  }

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude");
  }

  return textBlock.text;
}
