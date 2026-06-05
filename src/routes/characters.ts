import { Router } from "express";
import { mockCharacters } from "../lib/mock.js";

export const charactersRouter = Router();

charactersRouter.get("/", (_req, res) => {
  res.json({ characters: mockCharacters });
});
