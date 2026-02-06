import express, { Request, Response } from "express";

const router = express.Router();

/**
 * Stub: accepts class create payload and returns 201 so frontend does not 404.
 * Replace with real DB insert when classes table exists.
 */
router.post("/", (req: Request, res: Response) => {
  const body = req.body as Record<string, unknown>;
  res.status(201).json({
    data: {
      id: 0,
      ...body,
    },
  });
});

export default router;
