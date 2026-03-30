import { useState, useEffect, useRef } from "react";

export interface User {
    id: string;
    username: string;
}

export interface ChatMessage {
    id: string;
    senderId: string;
    username: string;
    content: string;
    channelId?: string;
    timestamp: number;
}

export function useChat(serverUrl: string, token: string) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [activeChannel, setActiveChannel] = useState<string>("general");
    const [voiceChannel, setVoiceChannel] = useState<string | null>(null);
    const [incomingSignals, setIncomingSignals] = useState<any[]>([]);
    const [globalVoiceUsers, setGlobalVoiceUsers] = useState<Record<string, User[]>>({});
    
    const wsRef = useRef<WebSocket | null>(null);
    const voiceChannelRef = useRef<string | null>(null);

    // Keep ref always in sync with state
    useEffect(() => {
        voiceChannelRef.current = voiceChannel;
    }, [voiceChannel]);

    // Connect to WebSocket
    useEffect(() => {
        const wsUrl = serverUrl.replace(/^http/, 'ws') + '/ws?token=' + token;
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
            console.log("Connected to server");
        };

        ws.onmessage = (event: MessageEvent) => {
            const data = JSON.parse(event.data as string) as { type: string, content: any, senderId?: string, targetId?: string };
            if (data.type === "WELCOME") {
                const content = data.content as { id: string, username: string, history: ChatMessage[], users: User[], voiceRooms?: Record<string, User[]> };
                setCurrentUser({ id: content.id, username: content.username });
                setMessages(content.history || []);
                const uniqueUsers = Array.from(new Map(content.users?.map(u => [u.id, u])).values());
                setUsers(uniqueUsers);
                if (content.voiceRooms) setGlobalVoiceUsers(content.voiceRooms);
            } else if (data.type === "NEW_MESSAGE") {
                const content = data.content as ChatMessage;
                setMessages((prev) => [...prev, content]);
            } else if (data.type === "USER_JOINED") {
                const content = data.content as User;
                setUsers((prev) => {
                    if (!prev.find(u => u.id === content.id)) {
                        return [...prev, content];
                    }
                    return prev;
                });
            } else if (data.type === "USER_LEFT") {
                const content = data.content as { id: string };
                setUsers((prev) => prev.filter(u => u.id !== content.id));
            } else if (data.type === "USER_JOINED_VOICE") {
                const content = data.content as { id: string, username: string, channelId: string };
                setGlobalVoiceUsers(prev => {
                    const cUsers = prev[content.channelId] || [];
                    if (cUsers.find(u => u.id === content.id)) return prev;
                    return { ...prev, [content.channelId]: [...cUsers, { id: content.id, username: content.username }] };
                });
                setIncomingSignals(prev => [...prev, {
                    type: data.type, content: data.content,
                    senderId: data.senderId, targetId: data.targetId, id: crypto.randomUUID()
                }]);
            } else if (data.type === "USER_LEFT_VOICE") {
                const content = data.content as { id: string, channelId: string };
                setGlobalVoiceUsers(prev => ({
                    ...prev, [content.channelId]: (prev[content.channelId] || []).filter(u => u.id !== content.id)
                }));
                setIncomingSignals(prev => [...prev, {
                    type: data.type, content: data.content,
                    senderId: data.senderId, targetId: data.targetId, id: crypto.randomUUID()
                }]);
            } else if (data.type === "VOICE_ROOM_STATE") {
                setIncomingSignals(prev => [...prev, {
                    type: data.type, content: data.content,
                    senderId: "server", targetId: "all", id: crypto.randomUUID()
                }]);
            } else if (["WEBRTC_OFFER", "WEBRTC_ANSWER", "WEBRTC_ICE_CANDIDATE", "MEDIA_STATE_CHANGED", "SCREEN_SHARE_CHANGED", "INIT_PEER"].includes(data.type)) {
                setIncomingSignals(prev => [...prev, {
                    type: data.type,
                    content: data.content,
                    senderId: data.senderId,
                    targetId: data.targetId,
                    id: crypto.randomUUID()
                }]);
            }
        };

        ws.onclose = () => {
            console.log("Disconnected from server");
        };

        return () => {
            ws.close();
        };
    }, [serverUrl, token]);

    // Clear WebRTC signal backlog when disconnecting from a call
    useEffect(() => {
        if (!voiceChannel) {
            setIncomingSignals([]);
        }
    }, [voiceChannel]);

    const sendMessage = (content: string, channelId: string) => {
        if (content.trim() && wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: "CHAT_MESSAGE",
                content: content.trim(),
                channelId
            }));
            return true;
        }
        return false;
    };

    const sendSignal = (type: string, content: any, targetId?: string) => {
        const ch = voiceChannelRef.current;
        console.log(`[ChatLayout] sendSignal: type=${type}, channelId=${ch}, targetId=${targetId}`);
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type,
                content,
                channelId: ch,
                targetId
            }));
        } else {
            console.warn(`[ChatLayout] sendSignal FAILED: WS not open, type=${type}`);
        }
    };

    return {
        messages,
        users,
        currentUser,
        activeChannel,
        setActiveChannel,
        voiceChannel,
        setVoiceChannel,
        incomingSignals,
        globalVoiceUsers,
        sendMessage,
        sendSignal
    };
}
