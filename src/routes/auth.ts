import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";

import { db } from "../db/index.js";
import { user, account } from "../db/schema/index.js";
import { verifyJwt, type JwtPayload } from "../middleware/auth.js";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET ?? "change-me-in-production";
const SALT_ROUNDS = 10;
const CREDENTIAL_PROVIDER = "credential";

const defaultRole = "student" as const;
const allowedRoles = ["student", "teacher", "admin"] as const;
type AllowedRole = (typeof allowedRoles)[number];

function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

function sanitizeUser(u: { id: string; name: string; email: string; role: string }) {
  return { id: u.id, name: u.name, email: u.email, role: u.role };
}

// POST /api/auth/register – role is required: "student" | "teacher" | "admin"
router.post("/register", async (req, res) => {
  try {
    const { email, password, name, role } = req.body as {
      email?: string;
      password?: string;
      name?: string;
      role?: string;
    };

    if (!email?.trim() || !password || !name?.trim()) {
      return res.status(400).json({
        error: "Bad Request",
        message: "email, password, and name are required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const roleValue: AllowedRole =
      role && allowedRoles.includes(role as AllowedRole) ? (role as AllowedRole) : defaultRole;

    const existing = await db.select().from(user).where(eq(user.email, normalizedEmail)).limit(1);
    if (existing.length > 0) {
      return res.status(409).json({ error: "Conflict", message: "Email already registered" });
    }

    const userId = randomUUID();
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    await db.insert(user).values({
      id: userId,
      name: name.trim(),
      email: normalizedEmail,
      emailVerified: false,
      role: roleValue,
    });

    await db.insert(account).values({
      id: randomUUID(),
      userId,
      accountId: normalizedEmail,
      providerId: CREDENTIAL_PROVIDER,
      password: hashedPassword,
    });

    const token = signToken({ sub: userId, email: normalizedEmail, role: roleValue });
    const newUser = await db.select().from(user).where(eq(user.id, userId)).limit(1);
    const created = newUser[0];
    if (!created) {
      return res.status(500).json({ error: "Internal Server Error", message: "Registration failed" });
    }
    return res.status(201).json({
      user: sanitizeUser(created),
      token,
    });
  } catch (e) {
    console.error("Register error:", e);
    return res.status(500).json({ error: "Internal Server Error", message: "Registration failed" });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email?.trim() || !password) {
      return res.status(400).json({
        error: "Bad Request",
        message: "email and password are required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const users = await db.select().from(user).where(eq(user.email, normalizedEmail)).limit(1);
    const u = users[0];
    if (!u) {
      return res.status(401).json({ error: "Unauthorized", message: "Invalid email or password" });
    }
    const accounts = await db
      .select()
      .from(account)
      .where(and(eq(account.userId, u.id), eq(account.providerId, CREDENTIAL_PROVIDER)))
      .limit(1);

    const credAccount = accounts[0];
    if (!credAccount?.password) {
      return res.status(401).json({ error: "Unauthorized", message: "Invalid email or password" });
    }

    const match = await bcrypt.compare(password, credAccount.password);
    if (!match) {
      return res.status(401).json({ error: "Unauthorized", message: "Invalid email or password" });
    }

    const token = signToken({ sub: u.id, email: u.email, role: u.role });
    return res.status(200).json({
      user: sanitizeUser(u),
      token,
    });
  } catch (e) {
    console.error("Login error:", e);
    return res.status(500).json({ error: "Internal Server Error", message: "Login failed" });
  }
});

// GET /api/auth/me – current user (requires Authorization: Bearer <token>)
router.get("/me", verifyJwt, async (req, res) => {
  try {
    const payload = (req as express.Request & { user: JwtPayload }).user;
    if (!payload) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const { sub } = payload;
    const users = await db.select().from(user).where(eq(user.id, sub)).limit(1);
    const me = users[0];
    if (!me) {
      return res.status(404).json({ error: "Not Found", message: "User not found" });
    }
    return res.status(200).json({ user: sanitizeUser(me) });
  } catch (e) {
    console.error("Me error:", e);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
