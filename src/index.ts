import "dotenv/config";
import express from "express";
import cors from "cors";
import { charactersRouter } from "./routes/characters.js";
import { conversationsRouter } from "./routes/conversations.js";
import { chatRouter } from "./routes/chat.js";
import { authRouter } from "./routes/auth.js";

const app = express();
const PORT = Number(process.env.PORT) || 4000;

const defaultOrigins = ["http://localhost:3000", "http://127.0.0.1:3000"];

function getAllowedOrigins(): string[] {
  const origins = new Set(defaultOrigins);

  if (process.env.FRONTEND_URL) {
    origins.add(process.env.FRONTEND_URL.replace(/\/$/, ""));
  }

  if (process.env.CORS_ORIGINS) {
    for (const origin of process.env.CORS_ORIGINS.split(",")) {
      const trimmed = origin.trim();
      if (trimmed) origins.add(trimmed);
    }
  }

  return [...origins];
}

app.use(
  cors({
    origin(origin, callback) {
      // Allow non-browser clients (curl, health checks)
      if (!origin) {
        callback(null, true);
        return;
      }

      const allowed = getAllowedOrigins();
      if (allowed.includes(origin)) {
        callback(null, true);
        return;
      }

      // Vercel production + preview deployments
      if (/^https:\/\/[a-z0-9-]+(\.[a-z0-9-]+)*\.vercel\.app$/.test(origin)) {
        callback(null, true);
        return;
      }

      console.warn("[cors] blocked origin:", origin);
      callback(new Error(`CORS blocked: ${origin}`));
    },
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
  console.log("[cors] allowed origins:", getAllowedOrigins().join(", "), "+ *.vercel.app");
});
