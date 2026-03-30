import { useTranslation } from "react-i18next";
import { VolumeIcon, DisconnectSmallIcon, MutedMicrophoneIcon, MicrophoneIcon, CameraOffIcon, CameraIcon, SettingsIcon } from "../ui/icons";
import { IconButton } from "../ui/IconButton";
import type { User } from "../../hooks/useChat";

interface ChannelSidebarProps {
    activeChannel: string;
    setActiveChannel: (channel: string) => void;
    voiceChannel: string | null;
    setVoiceChannel: (channel: string | null) => void;
    globalVoiceUsers: Record<string, User[]>;
    currentUser: User | null;
    isMuted: boolean;
    setIsMuted: (val: boolean) => void;
    isVideoOff: boolean;
    setIsVideoOff: (val: boolean) => void;
    loadDevices: () => Promise<void>;
    setShowSettings: (val: boolean) => void;
    voiceStatus?: 'connecting' | 'connected' | 'error';
    onVoiceStatusClick?: () => void;
}

export function ChannelSidebar({
    activeChannel,
    setActiveChannel,
    voiceChannel,
    setVoiceChannel,
    globalVoiceUsers,
    currentUser,
    isMuted,
    setIsMuted,
    isVideoOff,
    setIsVideoOff,
    loadDevices,
    setShowSettings,
    voiceStatus,
    onVoiceStatusClick
}: ChannelSidebarProps) {
    const { t } = useTranslation();

    return (
        <div className="w-60 bg-gray-800 flex-shrink-0 flex flex-col">
            <div className="h-12 shadow-sm flex items-center px-4 font-bold text-[15px] border-b border-gray-900/50 hover:bg-gray-700/50 cursor-pointer transition-colors">
                {t('chat.serverName')}
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-[2px]">
                <div className="px-2 font-semibold text-xs text-gray-400 uppercase tracking-wider mt-4 mb-1">
                    {t('chat.textChannels')}
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
                    {t('chat.voiceChannels')}
                </div>
                <div 
                    onClick={() => {
                        setVoiceChannel('lobby');
                        setActiveChannel('lobby');
                    }}
                    className={`px-2 py-1.5 rounded cursor-pointer transition-colors flex items-center gap-1.5 text-[15px] ${activeChannel === 'lobby' ? 'bg-gray-700/50 text-white' : 'hover:bg-gray-700/50 text-gray-400 hover:text-gray-200'} ${voiceChannel === 'lobby' && activeChannel !== 'lobby' ? 'text-green-400' : ''}`}
                >
                    <VolumeIcon />
                    Lobby
                </div>
                
                {/* Always show who is in the Lobby globally */}
                {(globalVoiceUsers['lobby'] && globalVoiceUsers['lobby'].length > 0) && (
                    <div className="pl-6 mt-1 space-y-1">
                        {globalVoiceUsers['lobby'].map((u) => (
                            <div key={u.id} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-700/50 cursor-pointer group/voiceuser">
                                <div className="relative">
                                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}`} className="w-6 h-6 rounded-full bg-indigo-500" />
                                    {u.id === currentUser?.id && <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border-2 border-gray-800 rounded-full"></div>}
                                </div>
                                <span className={`text-sm truncate ${u.id === currentUser?.id ? 'text-gray-300' : 'text-gray-400 group-hover/voiceuser:text-gray-300'}`}>
                                    {u.username}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            
            {/* Voice Connected Panel */}
            {voiceChannel && (
                <div 
                    className="h-12 bg-gray-900 border-t border-gray-800 flex items-center px-3 justify-between cursor-pointer hover:bg-gray-800 transition-colors"
                    onClick={() => { if (onVoiceStatusClick) onVoiceStatusClick(); }}
                >
                    <div className="flex flex-col overflow-hidden">
                        <div className={`text-xs font-bold leading-tight ${
                            voiceStatus === 'connecting' ? 'text-orange-400 animate-pulse' :
                            voiceStatus === 'error' ? 'text-red-400' :
                            'text-green-400'
                        }`}>
                            {voiceStatus === 'connecting' ? t('chat.connecting', 'Connecting...') :
                             voiceStatus === 'error' ? t('chat.connectionError', 'Connection Error') :
                             t('chat.voiceConnected')}
                        </div>
                        <div className="text-gray-400 text-[11px] hover:underline cursor-pointer">Lobby / General</div>
                    </div>
                    <button 
                        onClick={(e) => { 
                            e.stopPropagation(); 
                            setVoiceChannel(null); 
                            setActiveChannel("general"); 
                        }} 
                        className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-red-400 relative z-10" 
                        title={t('chat.disconnect')}
                    >
                        <DisconnectSmallIcon />
                    </button>
                </div>
            )}
            
            <div className="h-[52px] bg-gray-900/50 flex items-center px-2 space-x-2">
                <div className="w-8 h-8 rounded-full bg-indigo-500 overflow-hidden cursor-pointer flex-shrink-0">
                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.username || 'Guest'}`} alt="avatar" />
                </div>
                <div className="text-sm font-semibold flex-1 overflow-hidden">
                    <div className="truncate">{currentUser?.username || t('chat.connecting')}</div>
                    <div className="text-xs text-gray-400 text-[11px]">#{currentUser?.id?.slice(0,4) || '----'}</div>
                </div>
                <div className="flex gap-1 text-gray-400">
                    <IconButton 
                        variant="ghost" rounded="rounded" className="w-8 h-8"
                        title={isMuted ? t('chat.unmute') : t('chat.mute')}
                        onClick={() => setIsMuted(!isMuted)}
                    >
                        {isMuted ? <MutedMicrophoneIcon className="w-5 h-5 text-red-400" /> : <MicrophoneIcon className="w-5 h-5" />}
                    </IconButton>
                    <IconButton 
                        variant="ghost" rounded="rounded" className="w-8 h-8"
                        title={isVideoOff ? t('chat.cameraOn') : t('chat.cameraOff')}
                        onClick={() => setIsVideoOff(!isVideoOff)}
                    >
                        {isVideoOff ? <CameraOffIcon className="w-5 h-5 text-red-400" /> : <CameraIcon className="w-5 h-5" />}
                    </IconButton>
                    <IconButton 
                        variant="ghost" rounded="rounded" className="w-8 h-8"
                        title={t('chat.settings')}
                        onClick={() => {
                            loadDevices();
                            setShowSettings(true);
                        }}
                    >
                        <SettingsIcon className="w-5 h-5 transition-transform hover:rotate-90" />
                    </IconButton>
                </div>
            </div>
        </div>
    );
}
