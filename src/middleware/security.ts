import type { NextFunction, Request, Response } from "express";
import { slidingWindow } from "@arcjet/node";
import aj from "../config/arcjet.js";
import { ArcjetNodeRequest } from "@arcjet/node";

type RequestWithUser = Request & {
  user?: { role?: "admin" | "teacher" | "student" | "guest" };
};

const securityMidleware = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction,
) => {
  if (
    process.env.NODE_ENV === "TEST" ||
    process.env.NODE_ENV === "development" ||
    !process.env.NODE_ENV
  )
    return next();

  try {
    const role = (req.user?.role ?? "student") as "admin" | "teacher" | "student" | "guest";

    let limit: number;
    let message: string;

    switch (role) {
      case "admin":
        limit = 120;
        message = "Admin request limit exceeded (120 per minute)";
        break;
      case "teacher":
        limit = 60;
        message = "Teacher request limit exceeded (60 per minute)";
        break;
      case "student":
        limit = 30;
        message = "Student request limit exceeded (30 per minute)";
        break;
      default:
        limit = 15;
        message =
          "Guest request limit exceeded (15 per minute) please signup for higher limits";
        break;
    }

    const client = aj.withRule(
      slidingWindow({
        mode: "LIVE",
        max: limit,
        interval: "1m",
      }),
    );

    const arcjetRequest: ArcjetNodeRequest = {
      method: req.method,
      url: req.originalUrl ?? req.url,
      headers: req.headers,
      socket: {
        remoteAddress: req.socket.remoteAddress ?? req.ip ?? "0.0.0.0",
      },
    };

    const decision = await client.protect(arcjetRequest);
    if (decision.isDenied() && decision.reason.isBot()) {
      return res.status(403).json({
        error: "Forbidden",
        message: "Automated requests are not allowd",
      });
    }
    if (decision.isDenied() && decision.reason.isShield()) {
      return res.status(403).json({
        error: "Forbidden",
        message: "Request blocked by security policy",
      });
    }
    if (decision.isDenied() && decision.reason.isRateLimit()) {
      return res.status(429).json({
        error: "Too many request",
        message: "Something went wrong with security middleware",
      });
    }

    next();
  } catch (e) {
    console.log("Security middleware error:", e);
    res.status(500).json({
      error: "internal error, ",
      message: "Something wnet wrong with security middleware",
    });
  }
};

export default securityMidleware;
