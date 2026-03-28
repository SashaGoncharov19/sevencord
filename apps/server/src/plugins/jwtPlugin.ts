import { Elysia, t } from "elysia";
import { jwt } from "@elysiajs/jwt";

/**
 * Shared JWT plugin. All routes that need auth should `.use(jwtPlugin)`.
 * The `name` field tells Elysia to deduplicate this plugin across modules.
 */
export const jwtPlugin = new Elysia({ name: "jwt-plugin" }).use(
  jwt({
    name: "auth",
    secret: process.env.JWT_SECRET ?? "F1DC0rdS3cr3t",
    schema: t.Object({
      id: t.String(),
      username: t.String(),
    }),
  })
);
