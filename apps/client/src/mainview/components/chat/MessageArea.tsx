import { useTranslation } from "react-i18next";
import { PlusIcon, PaperPlaneIcon } from "../ui/icons";
import { IconButton } from "../ui/IconButton";
import type { ChatMessage } from "../../hooks/useChat";

interface MessageAreaProps {
    serverUrl: string;
    activeChannel: string;
    messages: ChatMessage[];
    messagesEndRef: React.RefObject<HTMLDivElement>;
    inputMessage: string;
    setInputMessage: (val: string) => void;
    handleSendMessage: (e: React.FormEvent<HTMLFormElement>) => void;
    children?: React.ReactNode;
}

export function MessageArea({
    serverUrl,
    activeChannel,
    messages,
    messagesEndRef,
    inputMessage,
    setInputMessage,
    handleSendMessage,
    children
}: MessageAreaProps) {
    const { t } = useTranslation();

    const filtered = messages.filter(m => (m.channelId || 'general') === activeChannel);
    
    const formatTs = (ts: number) => {
        const d = new Date(ts);
        const now = new Date();
        const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        if (d.toDateString() === now.toDateString()) return t('chat.todayAt', { time });
        const y = new Date(now); y.setDate(now.getDate() - 1);
        if (d.toDateString() === y.toDateString()) return t('chat.yesterdayAt', { time });
        return `${d.toLocaleDateString([], { month: '2-digit', day: '2-digit', year: 'numeric' })} ${time}`;
    };

    const groups: { senderId: string; username: string; timestamp: number; msgs: typeof messages }[] = [];
    for (const msg of filtered) {
        const last = groups[groups.length - 1];
        if (last && last.senderId === msg.senderId && (msg.timestamp - last.msgs[last.msgs.length - 1].timestamp) < 300000) {
            last.msgs.push(msg);
        } else {
            groups.push({ senderId: msg.senderId, username: msg.username, timestamp: msg.timestamp, msgs: [msg] });
        }
    }

    return (
        <div className="flex-1 bg-gray-700 flex flex-col min-w-0 relative">
            <div className="h-12 shadow-sm flex items-center px-4 border-b border-gray-900/20 font-semibold gap-2 z-10">
                <span className="text-gray-400 text-2xl">#</span>
                {activeChannel}
                <div className="ml-auto text-xs text-gray-400 truncate max-w-[200px]" title={serverUrl}>
                    {t('chat.connectedTo')} <span className="font-mono text-green-400">{serverUrl}</span>
                </div>
            </div>
            
            <div className={`flex-1 flex flex-col min-h-0 ${activeChannel === 'lobby' ? 'hidden' : ''}`}>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {groups.map((g) => (
                        <div key={g.msgs[0].id} className="flex gap-4 hover:bg-gray-600/20 px-1 py-0.5 rounded -mx-1">
                            <div className="w-10 h-10 rounded-full bg-indigo-500 overflow-hidden flex-shrink-0 cursor-pointer mt-0.5">
                                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${g.username}`} alt="avatar" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-baseline gap-2">
                                    <span className="font-medium hover:underline cursor-pointer text-indigo-400">{g.username}</span>
                                    <span className="text-xs text-gray-500">{formatTs(g.timestamp)}</span>
                                </div>
                                {g.msgs.map((msg) => (
                                    <div key={msg.id} className="text-gray-200 mt-0.5 break-words">
                                        {msg.content}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>
                
                {/* Message Input */}
                <div className="px-4 pb-6 pt-2 h-auto flex-shrink-0">
                    <form onSubmit={handleSendMessage} className="bg-gray-600 rounded-lg flex items-center focus-within:ring-2 focus-within:ring-indigo-500 pr-2 transition-shadow">
                        <button type="button" className="p-3 text-gray-400 hover:text-gray-200 transition-colors">
                            <PlusIcon />
                        </button>
                        <input 
                            type="text" 
                            value={inputMessage}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInputMessage(e.target.value)}
                            placeholder={t('chat.messagePh', { channel: activeChannel })} 
                            className="flex-1 bg-transparent py-3 px-1 focus:outline-none text-gray-200 placeholder-gray-400"
                        />
                        <IconButton type="submit" variant="ghost" rounded="rounded-md" className="w-10 h-10 ml-1 text-gray-400 hover:text-indigo-400 transition-colors">
                            <PaperPlaneIcon className="w-5 h-5 translate-x-px" />
                        </IconButton>
                    </form>
                </div>
            </div>

            {/* VoiceRoom child if any */}
            {children}
        </div>
    );
}
