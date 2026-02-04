import express, { Request, Response } from "express";
import router from "./routes/subjects";
import cors from "cors";

const app = express();
const PORT = 8000;

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  }),
);

// parse JSON request bodies
app.use(express.json());

app.use("/api/subjects", router);

// root route
app.get("/", (_req: Request, res: Response) => {
  res.json({ message: "Hello from Express + TypeScript" });
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});

export default router;
