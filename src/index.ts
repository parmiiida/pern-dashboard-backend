import('apminsight')
  .then(({ default: AgentAPI }) => AgentAPI.config())
  .catch(() => console.log('APM not available in this environment'));

import cors from "cors";
import express from "express";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import swaggerUi from "swagger-ui-express";

import subjectsRouter from "./routes/subjects.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const swaggerPath = join(__dirname, "openapi", "spec.json");
const swaggerDocument = JSON.parse(readFileSync(swaggerPath, "utf-8"));
import usersRouter from "./routes/users.js";
import classesRouter from "./routes/classes.js";
import departmentsRouter from "./routes/departments.js";
import statsRouter from "./routes/stats.js";
import enrollmentsRouter from "./routes/enrollments.js";
import authRouter from "./routes/auth.js";

// import securityMiddleware from "./middleware/security.js";

const app = express();
const PORT = Number(process.env.PORT) || 8000;

// CORS: production + localhost (frontend from local dev)
const ALLOWED_ORIGINS = [
  "https://pern-dashboard-up2l.vercel.app",
  process.env.FRONTEND_URL?.replace(/\/$/, ""),
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:5174",
  "http://localhost:5001",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5174",
  "http://127.0.0.1:5001",
].filter(Boolean) as string[];

const normalizeOrigin = (o: string | undefined) =>
  typeof o === "string" ? o.replace(/\/$/, "") : undefined;

function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return false;
  const n = normalizeOrigin(origin);
  return n !== undefined && ALLOWED_ORIGINS.some((a) => normalizeOrigin(a) === n);
}

function getAllowedOrigin(origin: string | undefined): string | null {
  if (!origin) return null;
  if (isOriginAllowed(origin)) return origin;
  return null;
}

// CORS headers on every response (so 4xx/5xx and OPTIONS all have them)
app.use((req, res, next) => {
  const origin = req.headers.origin as string | undefined;
  const allow = getAllowedOrigin(origin);
  if (allow) {
    res.setHeader("Access-Control-Allow-Origin", allow);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, PATCH, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Max-Age", "86400");
    return res.status(204).end();
  }
  next();
});

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      const allow = getAllowedOrigin(origin);
      return cb(null, allow !== null ? allow : false);
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Parse JSON body; accept even when Content-Type is missing (some clients omit it)
app.use(
  express.json({
    type: (req) => {
      const method = req.method ?? "";
      if (!["POST", "PUT", "PATCH"].includes(method)) return false;
      const ct = (req.headers["content-type"] ?? "").toLowerCase();
      return ct.includes("application/json") || ct === "";
    },
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

// app.use(securityMiddleware);

app.use("/api/auth", authRouter);
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