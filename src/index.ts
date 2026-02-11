import AgentAPI from "apminsight";
AgentAPI.config();

import express, { Request, Response } from "express";
import subjectsRouter from "./routes/subjects.js";
import usersRouter from "./routes/users.js";
import classesRouter from "./routes/classes.js";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth.js";
import securityMidleware from "./middleware/security.js";

const app = express();
const PORT = 8000;

if (!process.env.FRONTEND_URL) {
  throw new Error("FRONTEND_URL is not defined in environment variables");
}

// Virgülle ayrılmış birden fazla origin desteklenir (örn. prod + local dev)
const allowedOrigins = process.env.FRONTEND_URL.split(",").map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(null, false);
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// Better Auth: /api/sign-up/email, /api/sign-in/email, /api/get-session, vb.
// Sadece /api/subjects, /api/users, /api/classes REST route'larına next(); diğerleri auth'a.
// originalUrl kullanıyoruz (path mount'tan bağımsız, her ortamda tutarlı).
app.use("/api", (req, res, next) => {
  const apiPath = req.originalUrl?.split("?")[0] ?? req.url ?? "";
  if (
    apiPath.startsWith("/api/subjects") ||
    apiPath.startsWith("/api/users") ||
    apiPath.startsWith("/api/classes")
  ) {
    return next();
  }
  const contentType = (req.headers["content-type"] ?? "").toLowerCase();
  if (
    contentType === "text/plain" &&
    ["POST", "PUT", "PATCH"].includes(req.method)
  ) {
    req.headers["content-type"] = "application/json";
  }
  return toNodeHandler(auth)(req, res);
});

// parse JSON request bodies
app.use(express.json());

app.use(securityMidleware);

app.use("/api/subjects", subjectsRouter);
app.use("/api/users", usersRouter);
app.use("/api/classes", classesRouter);

// root route
app.get("/", (_req: Request, res: Response) => {
  res.json({ message: "Hello from Express + TypeScript" });
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});

export default subjectsRouter;
