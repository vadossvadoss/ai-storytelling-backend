import { Router } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { isDatabaseConnected, prisma } from "../lib/prisma.js";
import { hashPassword, verifyPassword } from "../lib/password.js";

export const authRouter = Router();

interface MockUser {
  id: string;
  email: string;
  name: string;
  passwordHash?: string;
  googleId?: string;
}

const mockUsers: MockUser[] = [];

const registerSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(6).max(128),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const googleSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  googleId: z.string().min(1),
});

function signToken(userId: string, email: string): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }

  return jwt.sign({ userId, email }, secret, { expiresIn: "7d" });
}

function formatUser(user: { id: string; email: string; name: string | null }) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
  };
}

authRouter.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: "Invalid registration data" });
    return;
  }

  const { name, email, password } = parsed.data;

  try {
    const passwordHash = await hashPassword(password);
    const dbConnected = await isDatabaseConnected();

    if (dbConnected) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        res.status(409).json({ error: "Email already registered" });
        return;
      }

      const user = await prisma.user.create({
        data: { name, email, passwordHash },
      });

      const token = signToken(user.id, user.email);
      res.status(201).json({ token, user: formatUser(user) });
      return;
    }

    const existing = mockUsers.find(
      (u) => u.email.toLowerCase() === email.toLowerCase()
    );
    if (existing) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }

    const user: MockUser = {
      id: `user-${Date.now()}`,
      email,
      name,
      passwordHash,
    };
    mockUsers.push(user);

    const token = signToken(user.id, user.email);
    res.status(201).json({
      token,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (error) {
    console.error("POST /api/auth/register error:", error);
    res.status(500).json({ error: "Registration failed" });
  }
});

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: "Invalid login credentials" });
    return;
  }

  const { email, password } = parsed.data;

  try {
    const dbConnected = await isDatabaseConnected();

    if (dbConnected) {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        res.status(401).json({ error: "Invalid email or password" });
        return;
      }

      if (!user.passwordHash) {
        res.status(401).json({ error: "This account uses Google sign-in" });
        return;
      }

      const valid = await verifyPassword(password, user.passwordHash);
      if (!valid) {
        res.status(401).json({ error: "Invalid email or password" });
        return;
      }

      const token = signToken(user.id, user.email);
      res.json({ token, user: formatUser(user) });
      return;
    }

    const user = mockUsers.find(
      (u) => u.email.toLowerCase() === email.toLowerCase()
    );
    if (!user) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    if (!user.passwordHash) {
      res.status(401).json({ error: "This account uses Google sign-in" });
      return;
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const token = signToken(user.id, user.email);
    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (error) {
    console.error("POST /api/auth/login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
});

authRouter.post("/google", async (req, res) => {
  const parsed = googleSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: "Invalid Google auth data" });
    return;
  }

  const { email, name, googleId } = parsed.data;

  try {
    const dbConnected = await isDatabaseConnected();

    if (dbConnected) {
      let user = await prisma.user.findUnique({ where: { googleId } });

      if (!user) {
        const byEmail = await prisma.user.findUnique({ where: { email } });
        if (byEmail) {
          user = await prisma.user.update({
            where: { id: byEmail.id },
            data: { googleId, name: byEmail.name ?? name },
          });
        } else {
          user = await prisma.user.create({
            data: { email, name, googleId },
          });
        }
      }

      const token = signToken(user.id, user.email);
      res.json({ token, user: formatUser(user) });
      return;
    }

    let user =
      mockUsers.find((u) => u.googleId === googleId) ??
      mockUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());

    if (user) {
      user.googleId = googleId;
      user.name = user.name || name;
    } else {
      user = {
        id: `user-${Date.now()}`,
        email,
        name,
        googleId,
      };
      mockUsers.push(user);
    }

    const token = signToken(user.id, user.email);
    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (error) {
    console.error("POST /api/auth/google error:", error);
    res.status(500).json({ error: "Google authentication failed" });
  }
});
