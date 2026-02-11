import('apminsight')
  .then(({ default: AgentAPI }) => AgentAPI.config())
  .catch(() => console.log('APM not available in this environment'));

import cors from "cors";
import express from "express";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import swaggerUi from "swagger-ui-express";
import { toNodeHandler } from "better-auth/node";

import subjectsRouter from "./routes/subjects.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const swaggerPath = join(__dirname, "openapi", "spec.json");
const swaggerDocument = JSON.parse(readFileSync(swaggerPath, "utf-8"));
import usersRouter from "./routes/users.js";
import classesRouter from "./routes/classes.js";
import departmentsRouter from "./routes/departments.js";
import statsRouter from "./routes/stats.js";
import enrollmentsRouter from "./routes/enrollments.js";

// import securityMiddleware from "./middleware/security.js";
import { auth } from "./lib/auth.js";

const app = express();
const PORT = Number(process.env.PORT) || 8000;

// CORS: env yoksa bile production frontend çalışsın
const ALLOWED_ORIGINS = [
  "https://pern-dashboard-up2l.vercel.app",
  process.env.FRONTEND_URL?.replace(/\/$/, ""),
  "http://localhost:5173",
  "http://localhost:3000",
].filter(Boolean) as string[];

function corsOriginFn(
  origin: string | undefined,
  cb: (err: Error | null, allow?: boolean | string) => void
) {
  if (!origin) return cb(null, true);
  if (ALLOWED_ORIGINS.includes(origin)) return cb(null, origin);
  return cb(null, false);
}

app.use(
  cors({
    origin: corsOriginFn,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Health check – confirms backend is reachable (e.g. Railway)
app.get("/health", (_, res) => {
  res.json({ ok: true, service: "backend" });
});

app.get("/", (_, res) => {
  res.send("Backend server is running!");
});

// Swagger UI – API docs at /api-docs (serves the Classroom Management API OpenAPI spec)
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// CORS preflight (OPTIONS): /api/auth/* için başlıkları garanti et
app.use("/api/auth", (req, res, next) => {
  if (req.method === "OPTIONS") {
    const origin = req.headers.origin;
    const allowOrigin =
      origin && ALLOWED_ORIGINS.includes(origin)
        ? origin
        : ALLOWED_ORIGINS[0] ?? "https://pern-dashboard-up2l.vercel.app";
    res.setHeader("Access-Control-Allow-Origin", allowOrigin);
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Max-Age", "86400");
    return res.status(204).end();
  }
  next();
});

// Better Auth: handle ALL /api/auth/* requests. express.json() SONRA olmalı (dokümante).
const authHandler = toNodeHandler(auth);
app.use("/api/auth", (req, res) => {
  req.url = req.originalUrl;
  authHandler(req, res);
});

app.use(express.json());

// app.use(securityMiddleware);

app.use("/api/subjects", subjectsRouter);
app.use("/api/users", usersRouter);
app.use("/api/classes", classesRouter);
app.use("/api/departments", departmentsRouter);
app.use("/api/stats", statsRouter);
app.use("/api/enrollments", enrollmentsRouter);

// 404 – so we get a JSON body and can see if request reached Express
app.use((req, res) => {
  res.status(404).json({
    error: "Not Found",
    path: req.originalUrl,
    message: "No route matched. Check base URL and path.",
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});