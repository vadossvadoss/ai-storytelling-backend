import { Router } from "express";
import { z } from "zod";
import { isDatabaseConnected, prisma } from "../lib/prisma.js";
import {
  mockCharacters,
  mockConversations,
  MOCK_USER_ID,
  type MockConversation,
} from "../lib/mock.js";
import { authMiddleware } from "../middleware/auth.js";

export const conversationsRouter = Router();

conversationsRouter.use(authMiddleware);

const createConversationSchema = z.object({
  title: z.string().min(1).max(200),
  characterId: z.string().min(1),
});

conversationsRouter.get("/", async (req, res) => {
  try {
    const userId = req.user?.userId ?? MOCK_USER_ID;
    const dbConnected = await isDatabaseConnected();

    if (dbConnected) {
      const conversations = await prisma.conversation.findMany({
        where: { userId },
        include: {
          messages: { orderBy: { createdAt: "asc" } },
          character: true,
        },
        orderBy: { updatedAt: "desc" },
      });
      res.json({ conversations });
      return;
    }

    const conversations = mockConversations.filter((c) => c.userId === userId);
    res.json({ conversations });
  } catch (error) {
    console.error("GET /api/conversations error:", error);
    const userId = req.user?.userId ?? MOCK_USER_ID;
    const conversations = mockConversations.filter((c) => c.userId === userId);
    res.json({ conversations });
  }
});

conversationsRouter.post("/", async (req, res) => {
  const parsed = createConversationSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { title, characterId } = parsed.data;
  const userId = req.user?.userId ?? MOCK_USER_ID;

  try {
    const dbConnected = await isDatabaseConnected();

    if (dbConnected) {
      const character = await prisma.character.findUnique({
        where: { id: characterId },
      });

      if (!character) {
        res.status(404).json({ error: "Character not found" });
        return;
      }

      const conversation = await prisma.conversation.create({
        data: { title, userId, characterId },
        include: { messages: true, character: true },
      });

      res.status(201).json({ conversation });
      return;
    }

    const character = mockCharacters.find((c) => c.id === characterId);
    if (!character) {
      res.status(404).json({ error: "Character not found" });
      return;
    }

    const now = new Date().toISOString();
    const conversation: MockConversation = {
      id: `conv-${Date.now()}`,
      title,
      userId,
      characterId,
      createdAt: now,
      updatedAt: now,
      messages: [],
    };

    mockConversations.unshift(conversation);
    res.status(201).json({ conversation });
  } catch (error) {
    console.error("POST /api/conversations error:", error);
    res.status(500).json({ error: "Failed to create conversation" });
  }
});
