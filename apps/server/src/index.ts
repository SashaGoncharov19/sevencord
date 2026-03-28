import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";

import { authRoutes } from "./routes/auth";
import { wsRoutes } from "./routes/ws";

const app = new Elysia()
  .use(
    cors({
      origin: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true,
    }),
  )
  .use(authRoutes)
  .use(wsRoutes)
  .get("/ping", () => ({ status: "ok" }))
  .get("/", () => "SevenCord server is running!")
  .listen(3000);

console.log(`Server listening at ${app.server?.hostname}:${app.server?.port}`);
