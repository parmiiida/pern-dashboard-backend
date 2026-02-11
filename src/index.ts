import('apminsight')
  .then(({ default: AgentAPI }) => AgentAPI.config())
  .catch(() => console.log('APM not available in this environment'));

import cors from "cors";
import express from "express";
import { toNodeHandler } from "better-auth/node";

import subjectsRouter from "./routes/subjects.js";
import usersRouter from "./routes/users.js";
import classesRouter from "./routes/classes.js";
import departmentsRouter from "./routes/departments.js";
import statsRouter from "./routes/stats.js";
import enrollmentsRouter from "./routes/enrollments.js";

// import securityMiddleware from "./middleware/security.js";
import { auth } from "./lib/auth.js";

const app = express();
const PORT = Number(process.env.PORT) || 8000;

app.use(
  cors({
    origin: process.env.FRONTEND_URL, // React app URL
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

// Better Auth: handle ALL /api/auth/* requests. Must be before express.json().
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