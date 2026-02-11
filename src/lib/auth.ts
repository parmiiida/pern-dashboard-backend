import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { db } from "../db/index.js"; // your drizzle instance
import * as schema from "../db/schema/auth.js";

const baseURL =
  process.env.BETTER_AUTH_BASE_URL ?? "http://localhost:8000";
// Origin'de trailing slash olmamalı (CORS/Origin header formatı)
const frontendUrl = process.env.FRONTEND_URL?.replace(/\/$/, "") || null;
const isProduction = baseURL.startsWith("https://");
const DEFAULT_PRODUCTION_FRONTEND = "https://pern-dashboard-up2l.vercel.app";
const trustedOrigins = frontendUrl
  ? [frontendUrl]
  : isProduction
    ? [DEFAULT_PRODUCTION_FRONTEND]
    : ["http://localhost:5173", "http://localhost:3000"];

export const auth = betterAuth({
  baseURL,
  basePath: "/api/auth",
  secret: process.env.BETTER_AUTH_SECRET!,
  trustedOrigins,
  advanced: {
    useSecureCookies: isProduction,
    // Cross-origin (farklı domain) için cookie: SameSite=None + Secure
    defaultCookieAttributes: isProduction
      ? { sameSite: "none" as const, secure: true }
      : undefined,
    // Sadece sorun giderme için: Railway'de BETTER_AUTH_DISABLE_CSRF=true deneyin; çalışırsa CSRF/origin kaynaklıdır. Sonra kapatın.
    ...(process.env.BETTER_AUTH_DISABLE_CSRF === "true" && {
      disableCSRFCheck: true,
    }),
  },
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: "student",
        input: true,
      },
      imageCldPubId: {
        type: "string",
        required: false,
        input: true,
      },
    },
  },
});