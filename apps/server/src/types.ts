export interface User {
  id: string;
  username: string;
}

export interface JwtPayload {
  id: string;
  username: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  username: string;
  content: string;
  channelId: string;
  timestamp: number;
}
