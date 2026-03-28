import { Elysia, t } from "elysia";
import { eq, desc } from "drizzle-orm";

import { db } from "../db";
import { users, messages } from "../db/schema";

import { jwtPlugin } from "../plugins/jwtPlugin";
import { activeUsers, voiceRooms, wsToUserId } from "../state";

import type { ChatMessage, User } from "../types";

// ─── Message shape ────────────────────────────────────────────────────────────

const WsBody = t.Object({
  type: t.String(),
  content: t.Any(),
  channelId: t.Optional(t.String()),
  targetId: t.Optional(t.String()),
});

const WsQuery = t.Object({
  token: t.String(),
});

// ─── Typed WS alias ───────────────────────────────────────────────────────────
// Elysia doesn't export ElysiaWS publicly, so we infer the exact type
// from the handler parameters of a throwaway .ws() call.
const _wsRef = new Elysia()
  .use(jwtPlugin)
  .ws("/ws", { body: WsBody, query: WsQuery });

type ExtractedWs = Parameters<Parameters<typeof _wsRef.ws>[1]["open"] & {}>[0];
type AppWs = Omit<ExtractedWs, "raw" | "body" | "~types">;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function broadcast(ws: AppWs, payload: Record<string, unknown>) {
  ws.publish("chat", payload);
}

function send(ws: AppWs, payload: Record<string, unknown>) {
  ws.send(payload);
}

function getUserId(ws: AppWs): string | undefined {
  return wsToUserId.get(ws.id);
}

function getUser(ws: AppWs): User | undefined {
  return activeUsers.get(ws.id);
}

// ─── Voice room helpers ───────────────────────────────────────────────────────

function removeFromAllVoiceRooms(ws: AppWs, userId: string) {
  for (const [channelId, participants] of voiceRooms.entries()) {
    if (!participants.has(ws.id)) continue;
    participants.delete(ws.id);
    ws.unsubscribe("voice:" + channelId);
    broadcast(ws, {
      type: "USER_LEFT_VOICE",
      content: { id: userId, channelId },
    });
  }
}

function voiceRoomUsers(channelId: string): User[] {
  return Array.from(voiceRooms.get(channelId) ?? [])
    .map((id) => activeUsers.get(id))
    .filter((u): u is User => u !== undefined);
}

// ─── WebSocket hook implementations ──────────────────────────────────────────

async function onOpen(ws: AppWs) {
  const token = ws.data.query.token;
  const payload = await ws.data.auth.verify(token);

  if (!payload) {
    ws.close();
    return;
  }

  const { id, username } = payload;
  const user: User = { id, username };

  wsToUserId.set(ws.id, id);
  activeUsers.set(ws.id, user);

  // Fetch message history
  const rows = await db
    .select({
      id: messages.id,
      senderId: messages.senderId,
      username: users.username,
      content: messages.content,
      channelId: messages.channelId,
      timestamp: messages.timestamp,
    })
    .from(messages)
    .innerJoin(users, eq(messages.senderId, users.id))
    .orderBy(desc(messages.timestamp))
    .limit(150);

  const history = rows
    .reverse()
    .map((r) => ({ ...r, timestamp: r.timestamp.getTime() }));

  // Build global voice state snapshot
  const voiceState: Record<string, User[]> = {};
  for (const [channelId] of voiceRooms.entries()) {
    voiceState[channelId] = voiceRoomUsers(channelId);
  }

  ws.subscribe("chat");

  send(ws, {
    type: "WELCOME",
    content: {
      id,
      username,
      history,
      users: Array.from(activeUsers.values()),
      voiceRooms: voiceState,
    },
  });

  broadcast(ws, { type: "USER_JOINED", content: user });
}

async function onMessage(ws: AppWs, message: typeof WsBody.static) {
  const id = getUserId(ws);
  if (!id) return;

  switch (message.type) {
    case "CHAT_MESSAGE": {
      const channelId = message.channelId ?? "general";
      const [inserted] = await db
        .insert(messages)
        .values({ senderId: id, content: message.content, channelId })
        .returning();

      const msg: ChatMessage = {
        id: inserted.id,
        senderId: id,
        username: getUser(ws)?.username ?? "Unknown",
        content: inserted.content,
        channelId: inserted.channelId,
        timestamp: inserted.timestamp.getTime(),
      };

      const payload = { type: "NEW_MESSAGE", content: msg };
      broadcast(ws, payload);
      send(ws, payload);
      break;
    }

    case "JOIN_VOICE": {
      const channelId = message.channelId ?? "lobby";

      // Force-clean any existing voice presence to prevent ghost state
      removeFromAllVoiceRooms(ws, id);

      if (!voiceRooms.has(channelId)) voiceRooms.set(channelId, new Set());
      voiceRooms.get(channelId)!.add(ws.id);
      ws.subscribe("voice:" + channelId);

      send(ws, {
        type: "VOICE_ROOM_STATE",
        content: { channelId, users: voiceRoomUsers(channelId) },
      });

      broadcast(ws, {
        type: "USER_JOINED_VOICE",
        content: { id, username: getUser(ws)?.username, channelId },
      });
      break;
    }

    case "LEAVE_VOICE": {
      const channelId = message.channelId ?? "lobby";
      voiceRooms.get(channelId)?.delete(ws.id);
      ws.unsubscribe("voice:" + channelId);
      broadcast(ws, { type: "USER_LEFT_VOICE", content: { id, channelId } });
      break;
    }

    case "WEBRTC_OFFER":
    case "WEBRTC_ANSWER":
    case "WEBRTC_ICE_CANDIDATE": {
      const targetId = message.targetId;
      if (!targetId) return;
      broadcast(ws, {
        type: message.type,
        content: message.content,
        senderId: id,
        targetId,
      });
      break;
    }

    case "MEDIA_STATE_CHANGED":
    case "SCREEN_SHARE_CHANGED": {
      broadcast(ws, {
        type: message.type,
        content: message.content,
        senderId: id,
      });
      break;
    }
  }
}

function onClose(ws: AppWs) {
  const id = getUserId(ws);
  if (!id) return;

  activeUsers.delete(ws.id);
  wsToUserId.delete(ws.id);
  removeFromAllVoiceRooms(ws, id);

  // Only announce departure if no other connections remain for this user
  const hasOtherConnections = [...wsToUserId.values()].includes(id);
  if (!hasOtherConnections) {
    broadcast(ws, { type: "USER_LEFT", content: { id } });
  }
}

// ─── Route ────────────────────────────────────────────────────────────────────

export const wsRoutes = new Elysia().use(jwtPlugin).ws("/ws", {
  body: WsBody,
  query: WsQuery,
  open: onOpen,
  message: onMessage,
  close: onClose,
});
