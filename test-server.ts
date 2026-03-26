import { Elysia } from "elysia";

const app = new Elysia()
  .ws("/ws-test", {
    open(ws) {
      console.log("-- Test WS Opened! --");
      ws.send(JSON.stringify({ hello: "world" }));
    },
    message(ws, msg) {
      console.log("-- Test WS Message:", msg);
    }
  })
  .listen(3005);
console.log("Mini WS test on 3005");
