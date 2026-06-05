import { Router } from "express";
import { z } from "zod";
import { generateResponse } from "../lib/claude.js";
import { isDatabaseConnected, prisma } from "../lib/prisma.js";
import {
  mockCharacters,
  mockConversations,
  MOCK_USER_ID,
} from "../lib/mock.js";
import { authMiddleware } from "../middleware/auth.js";

export const chatRouter = Router();

chatRouter.use(authMiddleware);

const chatSchema = z.object({
  message: z.string().min(1).max(10000),
  conversationId: z.string().optional(),
  characterId: z.string().optional(),
});

chatRouter.post("/", async (req, res) => {
  const parsed = chatSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { message, conversationId, characterId } = parsed.data;
  const userId = req.user?.userId ?? MOCK_USER_ID;

  try {
    let systemPrompt =
      "You are a creative storytelling companion. Respond in character with vivid, engaging prose.";

    const dbConnected = await isDatabaseConnected();

    if (dbConnected && conversationId) {
      const conversation = await prisma.conversation.findFirst({
        where: { id: conversationId, userId },
        include: {
          character: true,
          messages: { orderBy: { createdAt: "asc" }, take: 20 },
        },
      });

      if (!conversation) {
        res.status(404).json({ error: "Conversation not found" });
        return;
      }

      systemPrompt = `You are ${conversation.character.name}. ${conversation.character.personality} ${conversation.character.description}`;

      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: "USER",
          content: message,
        },
      });

      const history = conversation.messages.map((m) => ({
        role: m.role === "USER" ? ("user" as const) : ("assistant" as const),
        content: m.content,
      }));

      const aiResponse = await generateResponse({
        systemPrompt,
        messages: [...history, { role: "user", content: message }],
      });

      const assistantMessage = await prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: "ASSISTANT",
          content: aiResponse,
        },
      });

      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { updatedAt: new Date() },
      });

      res.json({
        response: aiResponse,
        message: assistantMessage,
        conversationId: conversation.id,
      });
      return;
    }

    if (characterId) {
      let character = mockCharacters.find((c) => c.id === characterId);

      if (dbConnected) {
        const dbCharacter = await prisma.character.findUnique({
          where: { id: characterId },
        });
        if (dbCharacter) {
          systemPrompt = `You are ${dbCharacter.name}. ${dbCharacter.personality} ${dbCharacter.description}`;
        }
      } else if (character) {
        systemPrompt = `You are ${character.name}. ${character.personality} ${character.description}`;
      }
    }

    let conversation = conversationId
      ? mockConversations.find(
          (c) => c.id === conversationId && c.userId === userId
        )
      : undefined;

    const history =
      conversation?.messages.map((m) => ({
        role: m.role === "USER" ? ("user" as const) : ("assistant" as const),
        content: m.content,
      })) ?? [];

    const aiResponse = await generateResponse({
      systemPrompt,
      messages: [...history, { role: "user", content: message }],
    });

    const now = new Date().toISOString();

    if (conversation) {
      conversation.messages.push(
        {
          id: `msg-${Date.now()}-user`,
          conversationId: conversation.id,
          role: "USER",
          content: message,
          createdAt: now,
        },
        {
          id: `msg-${Date.now()}-assistant`,
          conversationId: conversation.id,
          role: "ASSISTANT",
          content: aiResponse,
          createdAt: now,
        }
      );
      conversation.updatedAt = now;
    }

    res.json({
      response: aiResponse,
      conversationId: conversation?.id,
      message: {
        id: `msg-${Date.now()}-assistant`,
        role: "ASSISTANT",
        content: aiResponse,
        createdAt: now,
      },
    });
  } catch (error) {
    console.error("POST /api/chat error:", error);
    res.status(500).json({ error: "Failed to generate response" });
  }
});
