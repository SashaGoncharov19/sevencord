import { Elysia, t } from "elysia";
import { eq } from "drizzle-orm";

import { db } from "../db";
import { users } from "../db/schema";

import { jwtPlugin } from "../plugins/jwtPlugin";

export const authRoutes = new Elysia({ prefix: "/auth" })
  .use(jwtPlugin)
  .post(
    "/register",
    async ({ body, auth, status }) => {
      const [existing] = await db
        .select()
        .from(users)
        .where(eq(users.username, body.username))
        .limit(1);

      if (existing) return status(409, { error: "Username already exists" });

      const passwordHash = await Bun.password.hash(body.password);
      const [user] = await db
        .insert(users)
        .values({ username: body.username, passwordHash })
        .returning();

      const token = await auth.sign({ id: user.id, username: user.username });
      return { token, user: { id: user.id, username: user.username } };
    },
    {
      body: t.Object({
        username: t.String(),
        password: t.String(),
      }),
    },
  )
  .post(
    "/login",
    async ({ body, auth, status }) => {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.username, body.username))
        .limit(1);

      if (!user) return status(401, { error: "Invalid credentials" });

      const ok = await Bun.password.verify(body.password, user.passwordHash);
      if (!ok) return status(401, { error: "Invalid credentials" });

      const token = await auth.sign({ id: user.id, username: user.username });
      return { token, user: { id: user.id, username: user.username } };
    },
    {
      body: t.Object({
        username: t.String(),
        password: t.String(),
      }),
    },
  );
