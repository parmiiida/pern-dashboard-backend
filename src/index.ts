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

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  }),
);

// Better Auth: /api/sign-up/email, /api/sign-in/email, /api/get-session, vb.
// app.use("/api", ...) içinde req.path mount sonrasıdır: /api/users → req.path = "/users"
app.use("/api", (req, res, next) => {
  const path = req.path;
  if (
    path.startsWith("/subjects") ||
    path.startsWith("/users") ||
    path.startsWith("/classes")
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
