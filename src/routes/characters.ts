import { Router } from "express";
import { isDatabaseConnected, prisma } from "../lib/prisma.js";
import { mockCharacters } from "../lib/mock.js";

export const charactersRouter = Router();

charactersRouter.get("/", async (_req, res) => {
  try {
    const dbConnected = await isDatabaseConnected();

    if (dbConnected) {
      const characters = await prisma.character.findMany({
        orderBy: { name: "asc" },
      });
      if (characters.length > 0) {
        res.json({ characters });
        return;
      }
    }

    res.json({ characters: mockCharacters });
  } catch (error) {
    console.error("GET /api/characters error:", error);
    res.json({ characters: mockCharacters });
  }
});
