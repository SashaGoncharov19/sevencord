import type { User } from "./types";

/** ws.id → User */
export const activeUsers = new Map<string, User>();

/** ws.id → userId */
export const wsToUserId = new Map<string, string>();

/** channelId → Set of ws.id */
export const voiceRooms = new Map<string, Set<string>>();
