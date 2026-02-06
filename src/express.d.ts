import { name } from "drizzle-orm";

declare global {
  namespace Express {
    interface Request {
      user?: {
        role?: "admin" | "teacher" | "student";
      };
    }
  }
}
