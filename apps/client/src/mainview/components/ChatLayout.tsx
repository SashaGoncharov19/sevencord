import { useState, useEffect, useRef } from "react";
import VoiceRoom from "./VoiceRoom";

interface User {
  id: string;
  username: string;
}

interface ChatMessage {
  id: string;
  senderId: string;
  username: string;
  content: string;
  channelId?: string;
  timestamp: number;
}

interface ChatLayoutProps {
	serverUrl: string;
	token: string;
	onDisconnect: () => void;
}

export default function ChatLayout({ serverUrl, token, onDisconnect }: ChatLayoutProps) {
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [users, setUsers] = useState<User[]>([]);
	const [currentUser, setCurrentUser] = useState<User | null>(null);
	const [inputMessage, setInputMessage] = useState<string>("");
	const [activeChannel, setActiveChannel] = useState<string>("general");
	const [voiceChannel, setVoiceChannel] = useState<string | null>(null);
	const [voiceUsers, setVoiceUsers] = useState<User[]>([]);
	const [isMuted, setIsMuted] = useState<boolean>(false);
	const [isVideoOff, setIsVideoOff] = useState<boolean>(false);
	const [incomingSignals, setIncomingSignals] = useState<any[]>([]);
	
	const wsRef = useRef<WebSocket | null>(null);
	const messagesEndRef = useRef<HTMLDivElement | null>(null);

	// Connect to WebSocket
	useEffect(() => {
		const wsUrl = serverUrl.replace(/^http/, 'ws') + '/ws?token=' + token;
		const ws = new WebSocket(wsUrl);
		wsRef.current = ws;

		ws.onopen = () => {
			console.log("Connected to server");
		};

		ws.onmessage = (event: MessageEvent) => {
			const data = JSON.parse(event.data as string) as { type: string, content: unknown };
			if (data.type === "WELCOME") {
                const content = data.content as { id: string, username: string, history: ChatMessage[], users: User[] };
				setCurrentUser({ id: content.id, username: content.username });
				setMessages(content.history || []);
				// Deduplicate initial users
				const uniqueUsers = Array.from(new Map(content.users?.map(u => [u.id, u])).values());
				setUsers(uniqueUsers);
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
				setVoiceUsers(prev => {
					if (!prev.find(u => u.id === content.id)) {
						return [...prev, { id: content.id, username: content.username }];
					}
					return prev;
				});
				setIncomingSignals(prev => [...prev, {
					type: data.type, content: data.content,
					senderId: (data as any).senderId, targetId: (data as any).targetId, id: crypto.randomUUID()
				}]);
			} else if (data.type === "USER_LEFT_VOICE") {
				const content = data.content as { id: string, channelId: string };
				setVoiceUsers(prev => prev.filter(u => u.id !== content.id));
				setIncomingSignals(prev => [...prev, {
					type: data.type, content: data.content,
					senderId: (data as any).senderId, targetId: (data as any).targetId, id: crypto.randomUUID()
				}]);
			} else if (["WEBRTC_OFFER", "WEBRTC_ANSWER", "WEBRTC_ICE_CANDIDATE"].includes(data.type)) {
				setIncomingSignals(prev => [...prev, {
					type: data.type,
					content: data.content,
					senderId: (data as any).senderId,
					targetId: (data as any).targetId,
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
	}, [serverUrl]);

	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages]);

	const sendMessage = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (inputMessage.trim() && wsRef.current?.readyState === WebSocket.OPEN) {
			wsRef.current.send(JSON.stringify({
				type: "CHAT_MESSAGE",
				content: inputMessage.trim(),
				channelId: activeChannel
			}));
			setInputMessage("");
		}
	};

	const handleSendSignal = (type: string, content: any, targetId?: string) => {
		if (wsRef.current?.readyState === WebSocket.OPEN) {
			wsRef.current.send(JSON.stringify({
				type,
				content,
				channelId: voiceChannel,
				targetId
			}));
		}
	};

	// Discord-like dark theme layout
	return (
		<div className="flex h-screen bg-gray-800 text-gray-100 overflow-hidden font-sans">
			{/* Far Left Sidebar (Servers) */}
			<div className="w-[72px] bg-gray-900 flex-shrink-0 flex flex-col items-center py-3 space-y-2">
				<div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center cursor-pointer hover:rounded-xl transition-all duration-200 shadow-md">
					<span className="font-bold text-lg">DM</span>
				</div>
				<div className="w-8 h-[2px] bg-gray-700 rounded-full my-2" />
				<div className="w-12 h-12 bg-gray-700 rounded-[24px] hover:rounded-xl hover:bg-indigo-500 transition-all duration-200 cursor-pointer flex items-center justify-center">
					<span className="font-bold">S1</span>
				</div>
				<div className="w-12 h-12 bg-gray-700 rounded-[24px] hover:rounded-xl hover:bg-green-500 transition-all duration-200 cursor-pointer flex items-center justify-center mt-auto" onClick={onDisconnect} title="Disconnect">
					<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
					</svg>
				</div>
			</div>

			{/* Second Sidebar (Channels) */}
			<div className="w-60 bg-gray-800 flex-shrink-0 flex flex-col">
				<div className="h-12 shadow-sm flex items-center px-4 font-bold text-[15px] border-b border-gray-900/50 hover:bg-gray-700/50 cursor-pointer transition-colors">
					Server Name
				</div>
				<div className="flex-1 overflow-y-auto p-2 space-y-[2px]">
					<div className="px-2 font-semibold text-xs text-gray-400 uppercase tracking-wider mt-4 mb-1">
						Text Channels
					</div>
					<div 
						onClick={() => setActiveChannel('general')}
						className={`px-2 py-1.5 rounded cursor-pointer group flex items-center gap-1.5 text-[15px] transition-colors ${activeChannel === 'general' ? 'bg-gray-700/50 text-white' : 'hover:bg-gray-700/50 text-gray-400 hover:text-gray-200'}`}
					>
						<span className="text-gray-400 text-lg">#</span>
						general
					</div>
					<div 
						onClick={() => setActiveChannel('development')}
						className={`px-2 py-1.5 rounded cursor-pointer transition-colors flex items-center gap-1.5 text-[15px] ${activeChannel === 'development' ? 'bg-gray-700/50 text-white' : 'hover:bg-gray-700/50 text-gray-400 hover:text-gray-200'}`}
					>
						<span className="text-gray-400 text-lg">#</span>
						development
					</div>

					<div className="px-2 font-semibold text-xs text-gray-400 uppercase tracking-wider mt-6 mb-1">
						Voice Channels
					</div>
					<div 
						onClick={() => {
							setVoiceChannel('lobby');
							setActiveChannel('lobby');
						}}
						className={`px-2 py-1.5 rounded cursor-pointer transition-colors flex items-center gap-1.5 text-[15px] ${activeChannel === 'lobby' ? 'bg-gray-700/50 text-white' : 'hover:bg-gray-700/50 text-gray-400 hover:text-gray-200'} ${voiceChannel === 'lobby' && activeChannel !== 'lobby' ? 'text-green-400' : ''}`}
					>
						<svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
						</svg>
						Lobby
					</div>
					
					{voiceChannel === 'lobby' && (
						<div className="pl-6 mt-1 space-y-1">
							{/* Current User in voice */}
							<div className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-700/50 cursor-pointer">
								<img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.username}`} className="w-6 h-6 rounded-full bg-indigo-500" />
								<span className="text-sm text-gray-300 truncate">{currentUser?.username}</span>
							</div>
							{/* Other users in voice */}
							{voiceUsers.filter(u => u.id !== currentUser?.id).map((u) => (
								<div key={u.id} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-700/50 cursor-pointer">
									<img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}`} className="w-6 h-6 rounded-full bg-indigo-500" />
									<span className="text-sm text-gray-400 truncate">{u.username}</span>
								</div>
							))}
						</div>
					)}
				</div>
				
				{/* Voice Connected Panel (Above user profile) */}
				{voiceChannel && (
					<div className="h-12 bg-gray-900 border-t border-gray-800 flex items-center px-3 justify-between">
						<div className="flex flex-col overflow-hidden">
							<div className="text-green-400 text-xs font-bold leading-tight">Voice Connected</div>
							<div className="text-gray-400 text-[11px] hover:underline cursor-pointer">Lobby / General</div>
						</div>
						<button onClick={() => { setVoiceChannel(null); setVoiceUsers([]); setActiveChannel("general"); }} className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-red-400" title="Disconnect">
							<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" /></svg>
						</button>
					</div>
				)}
				<div className="h-[52px] bg-gray-900/50 flex items-center px-2 space-x-2">
					<div className="w-8 h-8 rounded-full bg-indigo-500 overflow-hidden cursor-pointer flex-shrink-0">
						<img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.username || 'Guest'}`} alt="avatar" />
					</div>
					<div className="text-sm font-semibold flex-1 overflow-hidden">
						<div className="truncate">{currentUser?.username || 'Connecting...'}</div>
						<div className="text-xs text-gray-400 text-[11px]">#{currentUser?.id?.slice(0,4) || '----'}</div>
					</div>
					<div className="flex gap-1 text-gray-400">
						<div 
							className="p-1.5 hover:bg-gray-700 rounded cursor-pointer" 
							title={isMuted ? "Unmute" : "Mute"}
							onClick={() => setIsMuted(!isMuted)}
						>
							{isMuted ? (
								<svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3l18 18" /></svg>
							) : (
								<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
							)}
						</div>
						<div 
							className="p-1.5 hover:bg-gray-700 rounded cursor-pointer" 
							title={isVideoOff ? "Turn on Camera" : "Turn off Camera"}
							onClick={() => setIsVideoOff(!isVideoOff)}
						>
							{isVideoOff ? (
								<svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3l18 18" /></svg>
							) : (
								<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
							)}
						</div>
					</div>
				</div>
			</div>

			{/* Main Chat Area */}
			<div className="flex-1 bg-gray-700 flex flex-col min-w-0">
				<div className="h-12 shadow-sm flex items-center px-4 border-b border-gray-900/20 font-semibold gap-2">
					<span className="text-gray-400 text-2xl">#</span>
					{activeChannel}
					<div className="ml-auto text-xs text-gray-400 truncate max-w-[200px]" title={serverUrl}>
						Connected to: <span className="font-mono text-green-400">{serverUrl}</span>
					</div>
				</div>
				<div className="flex-1 overflow-y-auto p-4 space-y-6">
					{messages.filter(m => (m.channelId || 'general') === activeChannel).map((msg: ChatMessage) => (
						<div key={msg.id} className="flex gap-4 group">
							<div className="w-10 h-10 rounded-full bg-indigo-500 overflow-hidden flex-shrink-0 cursor-pointer mt-0.5">
								<img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.username}`} alt="avatar" />
							</div>
							<div>
								<div className="flex items-baseline gap-2">
									<span className="font-medium hover:underline cursor-pointer text-indigo-400">{msg.username}</span>
									<span className="text-xs text-gray-400">{new Date(msg.timestamp).toLocaleTimeString()}</span>
								</div>
								<div className="text-gray-200 mt-1 break-words">
									{msg.content}
								</div>
							</div>
						</div>
					))}
					<div ref={messagesEndRef} />
				</div>
				
				{/* Message Input */}
				<div className="px-4 pb-6 pt-2">
					<form onSubmit={sendMessage} className="bg-gray-600 rounded-lg flex items-center focus-within:ring-2 focus-within:ring-indigo-500 pr-2 transition-shadow">
						<button type="button" className="p-3 text-gray-400 hover:text-gray-200 transition-colors">
							<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
							</svg>
						</button>
						<input 
							type="text" 
							value={inputMessage}
							onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInputMessage(e.target.value)}
							placeholder={`Message #${activeChannel}`} 
							className="flex-1 bg-transparent py-3 px-1 focus:outline-none text-gray-200 placeholder-gray-400"
						/>
						<button type="submit" className="p-2 text-indigo-400 hover:text-indigo-300 transition-colors bg-gray-700 rounded hover:bg-gray-600 ml-2">
							Send
						</button>
					</form>
				</div>
			</div>

			{/* Right Sidebar (Members) */}
			<div className="w-60 bg-gray-800 flex-shrink-0 flex flex-col hidden lg:flex">
				<div className="h-12 shadow-sm flex items-center justify-between px-4 border-b border-gray-900/50">
					<div className="flex gap-4 text-gray-400">
						<svg className="w-6 h-6 hover:text-gray-200 cursor-pointer" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
						</svg>
					</div>
				</div>
				<div className="flex-1 overflow-y-auto p-2">
					<div className="px-2 font-semibold text-xs text-gray-400 uppercase tracking-wider mt-4 mb-1">
						Online — {users.length}
					</div>
					{users.map((user: User) => (
						<div key={user.id} className="flex items-center gap-3 p-2 hover:bg-gray-700/50 rounded cursor-pointer transition-colors group">
							<div className="relative">
								<div className="w-8 h-8 rounded-full bg-indigo-500 overflow-hidden">
									<img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} alt="avatar" />
								</div>
								<div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-gray-800 rounded-full"></div>
							</div>
							<div className="font-medium text-[15px] group-hover:text-gray-100 text-gray-300 truncate">{user.username}</div>
						</div>
					))}
				</div>
			</div>
			
			{/* Voice Call Element (runs in background unless activeChannel === lobby) */}
			{voiceChannel && currentUser && (
				<VoiceRoom 
					channelId={voiceChannel}
					currentUserId={currentUser.id}
					onSendSignal={handleSendSignal}
					incomingSignals={incomingSignals}
					onDisconnect={() => {
						setVoiceChannel(null);
						setVoiceUsers([]);
						setActiveChannel("general");
					}}
					isMuted={isMuted}
					isVideoOff={isVideoOff}
					isVisible={activeChannel === "lobby"}
				/>
			)}
		</div>
	);
}
