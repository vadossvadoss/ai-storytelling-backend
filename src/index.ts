import "dotenv/config";
import express from "express";
import cors from "cors";
import { charactersRouter } from "./routes/characters.js";
import { conversationsRouter } from "./routes/conversations.js";
import { chatRouter } from "./routes/chat.js";
import { authRouter } from "./routes/auth.js";

const app = express();
const PORT = Number(process.env.PORT) || 4000;

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/characters", charactersRouter);
app.use("/api/auth", authRouter);
app.use("/api/conversations", conversationsRouter);
app.use("/api/chat", chatRouter);

app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
);

app.listen(PORT, () => {
  const key = process.env.ANTHROPIC_API_KEY;
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`ANTHROPIC_API_KEY: ${key ? `loaded (${key.slice(0, 12)}...)` : "NOT SET"}`);
  console.log("[server] dev mode: tsx watch — edits to src/ auto-reload (restart if changes don't appear)");
});
