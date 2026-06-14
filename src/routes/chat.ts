import { Router } from "express";
import { z } from "zod";
import { streamResponse } from "../lib/claude.js";
import { isDatabaseConnected, prisma } from "../lib/prisma.js";
import {
  mockCharacters,
  parseMockCharacterId,
  MOCK_USER_ID,
} from "../lib/mock.js";
import { authMiddleware } from "../middleware/auth.js";
import { logError, logChatStep } from "../lib/log-error.js";
import { initSSE, sendSSEToken, sendSSEDone, sendSSEError } from "../lib/sse.js";

export const chatRouter = Router();

chatRouter.use(authMiddleware);

const historyMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

const chatSchema = z.object({
  message: z.string().min(1).max(10000),
  conversationId: z.string().optional(),
  characterId: z.string().optional(),
  history: z.array(historyMessageSchema).max(40).optional(),
});

interface CharacterSource {
  id: string;
  name: string;
  systemPrompt: string;
}

interface ChatContext {
  systemPrompt: string;
  messages: { role: "user" | "assistant"; content: string }[];
  onComplete: (fullResponse: string) => Promise<{ messageId: string; createdAt: string; conversationId?: string }>;
}

async function findCharacter(characterId: string): Promise<CharacterSource | null> {
  const dbConnected = await isDatabaseConnected();

  if (dbConnected) {
    const character = await prisma.character.findUnique({
      where: { id: characterId },
      select: { id: true, name: true, systemPrompt: true },
    });
    if (character) return character;
  }

  const mock = mockCharacters.find((c) => c.id === characterId);
  if (!mock) return null;

  return {
    id: mock.id,
    name: mock.name,
    systemPrompt: mock.systemPrompt,
  };
}

function resolveCharacterId(
  conversationId: string | undefined,
  characterId: string | undefined
): string | null {
  if (characterId) return characterId;
  if (conversationId?.startsWith("mock-")) {
    return parseMockCharacterId(conversationId);
  }
  return null;
}

async function buildChatContext(
  userId: string,
  message: string,
  conversationId: string | undefined,
  characterId: string | undefined,
  history: { role: "user" | "assistant"; content: string }[]
): Promise<ChatContext | { error: string; status: number }> {
  const dbConnected = await isDatabaseConnected();

  if (dbConnected && conversationId && !conversationId.startsWith("mock-")) {
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, userId },
      include: {
        character: {
          select: { id: true, name: true, systemPrompt: true },
        },
        messages: { orderBy: { createdAt: "asc" }, take: 20 },
      },
    });

    if (!conversation) {
      return { error: "Conversation not found", status: 404 };
    }

    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "USER",
        content: message,
      },
    });

    const dbHistory = conversation.messages.map((m) => ({
      role: m.role === "USER" ? ("user" as const) : ("assistant" as const),
      content: m.content,
    }));

    return {
      systemPrompt: conversation.character.systemPrompt,
      messages: [...dbHistory, { role: "user", content: message }],
      onComplete: async (fullResponse) => {
        const assistantMessage = await prisma.message.create({
          data: {
            conversationId: conversation.id,
            role: "ASSISTANT",
            content: fullResponse,
          },
        });

        await prisma.conversation.update({
          where: { id: conversation.id },
          data: { updatedAt: new Date() },
        });

        return {
          messageId: assistantMessage.id,
          createdAt: assistantMessage.createdAt.toISOString(),
          conversationId: conversation.id,
        };
      },
    };
  }

  const resolvedCharacterId = resolveCharacterId(conversationId, characterId);
  if (!resolvedCharacterId) {
    return { error: "characterId is required", status: 400 };
  }

  const character = await findCharacter(resolvedCharacterId);
  if (!character) {
    return { error: "Character not found", status: 404 };
  }

  return {
    systemPrompt: character.systemPrompt,
    messages: [...history.slice(-20), { role: "user", content: message }],
    onComplete: async (fullResponse) => ({
      messageId: `msg-${Date.now()}`,
      createdAt: new Date().toISOString(),
      conversationId,
    }),
  };
}

chatRouter.post("/", async (req, res) => {
  logChatStep("request received", {
    userId: req.user?.userId,
    characterId: req.body?.characterId,
    conversationId: req.body?.conversationId,
    messageLength: req.body?.message?.length,
    historyLength: req.body?.history?.length,
  });

  const parsed = chatSchema.safeParse(req.body);

  if (!parsed.success) {
    const validationError = parsed.error.flatten();
    console.error("[chat] validation failed:", JSON.stringify(validationError, null, 2));
    res.status(400).json({ error: validationError });
    return;
  }

  const { message, conversationId, characterId, history = [] } = parsed.data;
  const userId = req.user?.userId ?? MOCK_USER_ID;

  try {
    const context = await buildChatContext(
      userId,
      message,
      conversationId,
      characterId,
      history
    );

    if ("error" in context) {
      console.error("[chat] context error:", context.error);
      res.status(context.status).json({ error: context.error });
      return;
    }

    initSSE(res);

    logChatStep("starting Claude stream", {
      historyCount: context.messages.length,
    });

    const fullResponse = await streamResponse({
      systemPrompt: context.systemPrompt,
      messages: context.messages,
      onToken: (token) => sendSSEToken(res, token),
    });

    const meta = await context.onComplete(fullResponse);

    logChatStep("stream complete", { responseLength: fullResponse.length });

    sendSSEDone(res, meta);
    res.end();
  } catch (error) {
    logError("POST /api/chat — stream failed", error);
    const errMessage =
      error instanceof Error ? error.message : "Failed to generate response";

    if (res.headersSent) {
      sendSSEError(res, errMessage);
      res.end();
    } else {
      res.status(500).json({ error: errMessage });
    }
  }
});
