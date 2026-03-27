import { Elysia, t } from "elysia";
import { cors } from "@elysiajs/cors";
import { jwt } from "@elysiajs/jwt";
import { db } from "./db";
import { users, messages } from "./db/schema";
import { eq, desc } from "drizzle-orm";

interface User {
  id: string;
  username: string;
}

interface ChatMessage {
  id: string;
  senderId: string;
  username: string;
  content: string;
  timestamp: number;
}

const activeUsers = new Map<string, User>();
const wsToUserId = new Map<string, string>();
const voiceRooms = new Map<string, Set<string>>(); // channelId -> Set of ws.id

// Setup shared JWT plugin
const setup = new Elysia({ name: "setup" }).use(
  jwt({
    name: "jwt",
    secret: process.env.JWT_SECRET || "F1DC0rdS3cr3t",
  })
);

// Break the chain to fix TS2589 (Type instantiation is excessively deep)
// Auth routes
const authRoutes = new Elysia()
  .use(setup)
  .post("/auth/register", async ({ body, jwt, set }) => {
    const { username, password } = body;

    const existingUser = await db.select().from(users).where(eq(users.username, username)).limit(1);
    
    if (existingUser.length > 0) {
      set.status = 409;
      return { error: "Username already exists" };
    }

    const passwordHash = await Bun.password.hash(password);
    
    const [newUser] = await db.insert(users).values({
      username,
      passwordHash,
    }).returning();
    
    const token = await jwt.sign({ id: newUser.id, username: newUser.username });
    
    return { token, user: { id: newUser.id, username: newUser.username } };
  }, {
    body: t.Object({
      username: t.String(),
      password: t.String(),
    })
  })
  .post("/auth/login", async ({ body, jwt, set }) => {
    const { username, password } = body;
    
    const existingUser = await db.select().from(users).where(eq(users.username, username)).limit(1);
    
    if (existingUser.length === 0) {
      set.status = 401;
      return { error: "Invalid credentials" };
    }
    
    const userRecord = existingUser[0];

    const isMatch = await Bun.password.verify(password, userRecord.passwordHash);
    if (!isMatch) {
      set.status = 401;
      return { error: "Invalid credentials" };
    }

    const token = await jwt.sign({ id: userRecord.id, username: userRecord.username });
    return { token, user: { id: userRecord.id, username: userRecord.username } };
  }, {
    body: t.Object({
      username: t.String(),
      password: t.String(),
    })
  });

// WebSockets routes
const wsRoutes = new Elysia()
  .use(setup)
  .ws("/ws", {
    body: t.Object({
      type: t.String(),
      content: t.Any(),
      channelId: t.Optional(t.String()),
      targetId: t.Optional(t.String()),
    }),
    query: t.Object({
      token: t.String()
    }),
    async open(ws: any) {
      console.log("--- WS OPEN TRIGGERED ---");
      try {
        let token = null;
        if (ws.data.query && ws.data.query.token) {
           token = ws.data.query.token;
        }

        if (!token) {
          console.log("No token in query");
          ws.close();
          return;
        }
      
        const payload = await (ws.data as any).jwt.verify(token);
        if (!payload) {
          console.log("Invalid JWT payload");
          ws.close();
          return;
        }

        const id = payload.id as string;
        const username = payload.username as string;
        
        wsToUserId.set(ws.id, id);
        console.log(`Connection opened: ${username} (WS ID: ${ws.id})`);
        
        const user: User = { id, username };
        activeUsers.set(ws.id, user);
        
        // Fetch history from DB
        const historyRows = await db.select({
          id: messages.id,
          senderId: messages.senderId,
          username: users.username,
          content: messages.content,
          channelId: messages.channelId,
          timestamp: messages.timestamp
        }).from(messages).innerJoin(users, eq(messages.senderId, users.id))
          .orderBy(desc(messages.timestamp)).limit(150);
          
        const history = historyRows.reverse().map(row => ({
          ...row,
          timestamp: row.timestamp.getTime()
        }));

        const globalVoiceState: Record<string, User[]> = {};
        for (const [vChannelId, participants] of voiceRooms.entries()) {
             globalVoiceState[vChannelId] = Array.from(participants)
                 .map(wsId => activeUsers.get(wsId))
                 .filter(Boolean) as User[];
        }

        ws.send({
          type: "WELCOME",
          content: {
            id,
            username,
            history,
            users: Array.from(activeUsers.values()),
            voiceRooms: globalVoiceState
          }
        });

        ws.publish("chat", {
          type: "USER_JOINED",
          content: user
        });
        ws.subscribe("chat");
        console.log("--- WS OPEN SUCCESS ---");
      } catch(e) {
         console.error("WS OPEN CATCH ERROR:", e);
      }
    },
    async message(ws: any, message: any) {
      const id = wsToUserId.get(ws.id);
      if (!id) return;

      const rawMessage = message as { type: string, content: string, channelId?: string };
      console.log(`Message from ${id}:`, rawMessage);
      
      if (rawMessage.type === "CHAT_MESSAGE") {
        const strContent = rawMessage.content;
        const channelId = rawMessage.channelId || 'general';
        
        const [insertedMsg] = await db.insert(messages).values({
          senderId: id,
          content: strContent,
          channelId,
        }).returning();

        const senderUsername = activeUsers.get(ws.id)?.username || 'Unknown';
        
        const newMessage: ChatMessage & { channelId: string } = {
          id: insertedMsg.id,
          senderId: id,
          username: senderUsername,
          content: insertedMsg.content,
          channelId: insertedMsg.channelId,
          timestamp: insertedMsg.timestamp.getTime(),
        };

        ws.publish("chat", {
          type: "NEW_MESSAGE",
          content: newMessage
        });
        ws.send({
          type: "NEW_MESSAGE",
          content: newMessage
        });
      } else if (rawMessage.type === "JOIN_VOICE") {
        const channelId = rawMessage.channelId || 'lobby';
        console.log(`[Server] JOIN_VOICE: user=${id}, channelId=${channelId}`);
        
        // FORCED CLEANUP: Remove user from ALL voice rooms first (prevents ghost presence)
        for (const [existingChannelId, participants] of voiceRooms.entries()) {
          if (participants.has(ws.id)) {
            participants.delete(ws.id);
            ws.unsubscribe("voice:" + existingChannelId);
            ws.publish("chat", {
              type: "USER_LEFT_VOICE",
              content: { id, channelId: existingChannelId }
            });
            console.log(`[Server] Forced cleanup: removed user=${id} from channel=${existingChannelId}`);
          }
        }

        if (!voiceRooms.has(channelId)) {
          voiceRooms.set(channelId, new Set());
        }
        
        // Get existing users BEFORE adding the new one
        const existingUserIds = Array.from(voiceRooms.get(channelId)!)
            .map(socketId => activeUsers.get(socketId))
            .filter(Boolean) as User[];

        voiceRooms.get(channelId)!.add(ws.id);
        ws.subscribe("voice:" + channelId);
        
        const allUsersInVoice = Array.from(voiceRooms.get(channelId)!)
            .map(socketId => activeUsers.get(socketId))
            .filter(Boolean) as User[];

        // Send room state to the joiner
        ws.send({
          type: "VOICE_ROOM_STATE",
          content: { channelId, users: allUsersInVoice }
        });

        // Broadcast to everyone that this user joined
        ws.publish("chat", {
          type: "USER_JOINED_VOICE",
          content: { id, username: activeUsers.get(ws.id)?.username, channelId }
        });

        // Send targeted INIT_PEER signals to each existing member
        // This tells each existing member to create a fresh peer connection to the new joiner
        for (const existingUser of existingUserIds) {
          ws.publish("chat", {
            type: "INIT_PEER",
            content: { initiatorId: existingUser.id, targetId: id },
            senderId: "server"
          });
        }
      } else if (rawMessage.type === "LEAVE_VOICE") {
        const channelId = rawMessage.channelId || 'lobby';
        console.log(`[Server] LEAVE_VOICE: user=${id}, channelId=${channelId}, roomHas=${voiceRooms.get(channelId)?.has(ws.id)}`);
        if (voiceRooms.has(channelId)) {
          voiceRooms.get(channelId)!.delete(ws.id);
        }
        ws.unsubscribe("voice:" + channelId);

        ws.publish("chat", {
          type: "USER_LEFT_VOICE",
          content: { id, channelId }
        });
      } else if (["WEBRTC_OFFER", "WEBRTC_ANSWER", "WEBRTC_ICE_CANDIDATE"].includes(rawMessage.type)) {
        // Forward WebRTC signaling to the specific target
        const targetId = (message as any).targetId;
        if (!targetId) return;
        
        ws.publish("chat", {
          type: rawMessage.type,
          content: rawMessage.content,
          senderId: id,
          targetId: targetId
        });
      } else if (rawMessage.type === "MEDIA_STATE_CHANGED") {
          ws.publish("chat", {
              type: "MEDIA_STATE_CHANGED",
              content: rawMessage.content,
              senderId: id
          });
      } else if (rawMessage.type === "SCREEN_SHARE_CHANGED") {
          ws.publish("chat", {
              type: "SCREEN_SHARE_CHANGED",
              content: rawMessage.content,
              senderId: id
          });
      }
    },
    close(ws: any) {
      const id = wsToUserId.get(ws.id);
      if (!id) return;

      console.log(`Connection closed: ${id}`);
      activeUsers.delete(ws.id);
      wsToUserId.delete(ws.id);
      
      // Remove from any voice rooms
      for (const [channelId, participants] of voiceRooms.entries()) {
        if (participants.has(ws.id)) {
           participants.delete(ws.id);
           ws.publish("chat", {
             type: "USER_LEFT_VOICE",
             content: { id, channelId }
           });
        }
      }

      // Calculate remaining connections for this user to decide whether to broadcast USER_LEFT
      let hasOtherConnections = false;
      for (const [socketId, userId] of wsToUserId.entries()) {
        if (userId === id) {
          hasOtherConnections = true;
          break;
        }
      }
      
      if (!hasOtherConnections) {
        ws.publish("chat", {
          type: "USER_LEFT",
          content: { id }
        });
      }
    }
  } as any);

// Main App instance
const app = new Elysia()
  .use(cors({
    origin: true,          // reflects any Origin header — allows desktop app requests
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }))
  .use(authRoutes)
  .use(wsRoutes)
  .get("/ping", () => ({ status: "ok" }))
  .get("/", () => "Elysia Chat Server is running!")
  .listen(3000);

console.log(
  `🦊 Elysia WebSocket Server is running at ${app.server?.hostname}:${app.server?.port}`
);
