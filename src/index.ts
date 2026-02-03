import express, { Request, Response } from "express";

const app = express();
const PORT = 8000;

// parse JSON request bodies
app.use(express.json());

// root route
app.get("/", (_req: Request, res: Response) => {
  res.json({ message: "Hello from Express + TypeScript" });
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});

export default app;
