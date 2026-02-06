import express, { Request, Response } from "express";

const router = express.Router();

/**
 * Stub: returns empty user list so frontend (e.g. teacher select) does not 404.
 * Replace with real DB query when users table exists.
 */
router.get("/", (_req: Request, res: Response) => {
  res.status(200).json({
    data: [],
    pagination: {
      total: 0,
      page: 1,
      limit: 100,
      totalPages: 0,
    },
  });
});

export default router;
