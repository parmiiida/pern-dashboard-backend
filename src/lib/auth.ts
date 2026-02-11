import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { db } from "../db/index.js"; // your drizzle instance
import * as schema from "../db/schema/auth.js";

const baseURL =
  process.env.BETTER_AUTH_BASE_URL ?? "http://localhost:8000";
const frontendUrl = process.env.FRONTEND_URL;
const trustedOrigins = frontendUrl ? [frontendUrl] : [];

export const auth = betterAuth({
  baseURL,
  basePath: "/api/auth",
  secret: process.env.BETTER_AUTH_SECRET!,
  trustedOrigins,
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