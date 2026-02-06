import express, { Request, Response } from "express";
import subjectsRouter from "./routes/subjects";
import usersRouter from "./routes/users";
import classesRouter from "./routes/classes";
import cors from "cors";

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

// parse JSON request bodies
app.use(express.json());

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
