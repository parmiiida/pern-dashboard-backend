import type { NextFunction, Request, Response } from "express";
import { slidingWindow } from "@arcjet/node";
import aj from "../config/arcjet.js";
import { ArcjetNodeRequest } from "@arcjet/node";

const securityMidleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (process.env.NODE_ENV === "TEST") return next();

  try {
    const role: RatelimitRole = req.user?.role ?? "student";

    let limit: number;
    let message: string;

    switch (role) {
      case "admin":
        limit = 20;
        message = "Admin request limit exceeded (20 per minute";
        break;
      case "teacher":
        limit = 5;
        message = "Teacher request limit exceeded (10 per minute)";
        break;
      case "student":
        limit = 10;
        message = "Student request limit exceeded (10 per minute)";
      default:
        limit = 5;
        message =
          "Guest request limit exceeded (5 per minute) please signup for higher limits";
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
