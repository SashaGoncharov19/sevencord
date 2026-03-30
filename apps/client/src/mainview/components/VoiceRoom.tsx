import { useTranslation } from "react-i18next";
import { useVoiceRoom } from "../hooks/useVoiceRoom";
import { VoiceDebugModal } from "./chat/VoiceDebugModal";
import { IconButton } from "./ui/IconButton";
import { CameraIcon, CameraOffIcon, MicrophoneIcon, MutedMicrophoneIcon, ScreenShareIcon, PhoneOffIcon, LiveAudioIcon, ExpandIcon, ShrinkIcon } from "./ui/icons";
import { useEffect, useRef } from "react";

interface VoiceRoomProps {
    channelId: string;
    currentUserId: string;
    onSendSignal: (type: string, content: any, targetId?: string) => void;
    incomingSignals: any[];
    onDisconnect: () => void;
    isMuted: boolean;
    isVideoOff: boolean;
    onToggleMute: () => void;
    onToggleVideo: () => void;
    isVisible: boolean;
    audioDeviceId?: string;
    videoDeviceId?: string;
    videoQuality?: string;
    noiseSuppression?: boolean;
    echoCancellation?: boolean;
    onStatusChange?: (status: 'connecting' | 'connected' | 'error') => void;
    showVoiceDebug?: boolean;
    onCloseVoiceDebug?: () => void;
    serverUrl?: string;
}

function RemoteVideo({ 
    stream, 
    username, 
    isVideoOff, 
    isMuted, 
    isPinned, 
    isLocal, 
    onClick 
}: { 
    stream: MediaStream | null; username: string; isVideoOff: boolean; isMuted: boolean; isPinned: boolean; isLocal: boolean; onClick: () => void 
}) {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    return (
        <div 
            onClick={onClick} 
            className={`relative rounded-xl overflow-hidden bg-gray-900 shadow-md border border-gray-700 cursor-pointer group transition-all w-full h-full flex items-center justify-center ${isPinned ? '' : 'aspect-video'}`}
        >
            <video 
                ref={videoRef} 
                autoPlay 
                muted={isLocal} 
                playsInline 
                className={`w-full h-full object-cover transition-opacity ${isLocal ? 'mirror transform scale-x-[-1]' : ''} ${isVideoOff ? 'opacity-0' : 'opacity-100'}`} 
            />
            {isVideoOff && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-800">
                      <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`} className={`${isPinned ? 'w-32 h-32' : 'w-16 h-16'} rounded-full shadow-lg bg-indigo-500 mb-2 transition-all`} alt={username} />
                 </div>
            )}
            <div className="absolute bottom-3 left-3 bg-gray-900/80 text-white px-2 py-1 rounded text-xs font-semibold backdrop-blur-sm shadow flex items-center gap-2 max-w-[80%]">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isMuted ? 'bg-red-500' : 'bg-green-400 animate-pulse'}`}></div>
                <span className="truncate">{username}</span>
            </div>
            {!isPinned && (
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-black/50 p-1.5 rounded-lg text-white backdrop-blur transition-opacity">
                    <ExpandIcon />
                </div>
            )}
            {isPinned && (
                <div className="absolute top-4 right-4 bg-black/50 p-2 rounded-lg text-white backdrop-blur cursor-pointer hover:bg-black/70 transition-colors">
                    <ShrinkIcon />
                </div>
            )}
        </div>
    );
}

export default function VoiceRoom(props: VoiceRoomProps) {
    const { t } = useTranslation();

    const {
        localStream,
        remoteStreams,
        roomUsers,
        pinnedUserId,
        isScreenSharing,
        toggleScreenShare,
        togglePin,
        getConnectionStats
    } = useVoiceRoom(props);

    const items = [
        { id: props.currentUserId, stream: localStream, username: t('chat.you', 'You'), isVideoOff: props.isVideoOff, isMuted: props.isMuted, isLocal: true },
        ...Object.entries(roomUsers).map(([id, u]) => ({
            id, stream: remoteStreams[id] || null, username: u.username, isVideoOff: u.isVideoOff, isMuted: u.isMuted, isLocal: false
        }))
    ];

    const renderVideoGrid = () => {
        if (pinnedUserId && items.find(i => i.id === pinnedUserId)) {
            const pinnedItem = items.find(i => i.id === pinnedUserId)!;
            const others = items.filter(i => i.id !== pinnedUserId);
            return (
                <div className="flex flex-col h-full w-full gap-4 pb-20">
                    <div className="flex-1 w-full rounded-2xl overflow-hidden bg-black shadow-2xl">
                        <RemoteVideo 
                            stream={pinnedItem.stream} 
                            username={pinnedItem.username} 
                            isVideoOff={pinnedItem.isVideoOff} 
                            isMuted={pinnedItem.isMuted} 
                            isPinned={true} 
                            isLocal={pinnedItem.isLocal} 
                            onClick={() => togglePin(pinnedItem.id)} 
                        />
                    </div>
                    {others.length > 0 && (
                        <div className="h-40 w-full flex gap-4 overflow-x-auto pb-2 flex-shrink-0 snap-x">
                            {others.map(item => (
                                <div key={item.id} className="h-full w-[280px] flex-shrink-0 snap-center">
                                    <RemoteVideo 
                                        stream={item.stream} 
                                        username={item.username} 
                                        isVideoOff={item.isVideoOff} 
                                        isMuted={item.isMuted} 
                                        isPinned={false} 
                                        isLocal={item.isLocal} 
                                        onClick={() => togglePin(item.id)} 
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            );
        }

        return (
            <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-20 items-center content-center">
                 {items.map(item => (
                     <div key={item.id} className="w-full h-full max-h-[40vh] min-h-[250px] transition-all">
                         <RemoteVideo 
                             stream={item.stream} 
                             username={item.username} 
                             isVideoOff={item.isVideoOff} 
                             isMuted={item.isMuted} 
                             isPinned={false} 
                             isLocal={item.isLocal} 
                             onClick={() => togglePin(item.id)} 
                         />
                     </div>
                 ))}
            </div>
        );
    };

    return (
        <div className={`flex-1 flex flex-col items-center p-6 bg-gray-800 overflow-hidden relative ${!props.isVisible ? 'hidden' : ''}`}>
            <div className="w-full flex justify-between items-center mb-4 flex-shrink-0">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <LiveAudioIcon />
                    {t('chat.voiceChannel', 'Voice Channel:')} <span className="text-gray-400 capitalize">{props.channelId}</span>
                </h2>
                <div className="flex gap-2 text-sm text-gray-400 bg-gray-900/50 px-3 py-1.5 rounded-full border border-gray-700/50">
                    <span className="font-semibold text-gray-200">{items.length}</span> {t('chat.inCallStrict', 'In Call')}
                </div>
            </div>
            
            <div className="flex-1 w-full max-w-7xl relative">
                {renderVideoGrid()}
            </div>
            
            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex items-center gap-4 bg-gray-900/95 backdrop-blur-md px-6 py-3 rounded-2xl shadow-xl border border-gray-700 z-50">
                <IconButton 
                    onClick={props.onToggleVideo}
                    className={props.isVideoOff ? 'bg-gray-800 text-red-500 hover:bg-gray-700' : 'bg-gray-700 text-white hover:bg-gray-600'}
                    title={props.isVideoOff ? t('chat.cameraOn') : t('chat.cameraOff')}
                >
                    {props.isVideoOff ? <CameraOffIcon className="w-6 h-6" /> : <CameraIcon className="w-6 h-6" />}
                </IconButton>
                
                <IconButton 
                    onClick={props.onToggleMute}
                    className={props.isMuted ? 'bg-gray-800 text-red-500 hover:bg-gray-700' : 'bg-gray-700 text-white hover:bg-gray-600'}
                    title={props.isMuted ? t('chat.unmute') : t('chat.mute')}
                >
                    {props.isMuted ? <MutedMicrophoneIcon className="w-6 h-6" /> : <MicrophoneIcon className="w-6 h-6" />}
                </IconButton>

                <IconButton 
                    onClick={toggleScreenShare}
                    className={isScreenSharing ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30 ring-2 ring-green-500/50' : 'bg-gray-700 text-white hover:bg-gray-600'}
                    title={isScreenSharing ? t('chat.stopShare', 'Stop Sharing') : t('chat.shareScreen', 'Share Screen')}
                >
                    <ScreenShareIcon className="w-6 h-6" />
                </IconButton>

                <div className="w-[1px] h-8 bg-gray-700 mx-2"></div>

                <IconButton 
                    onClick={props.onDisconnect}
                    className="bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white"
                    title={t('chat.disconnect')}
                >
                    <PhoneOffIcon className="w-6 h-6 transform rotate-135" />
                </IconButton>
            </div>

            {props.showVoiceDebug && props.onCloseVoiceDebug && props.serverUrl && (
                <VoiceDebugModal 
                    onClose={props.onCloseVoiceDebug}
                    getConnectionStats={getConnectionStats}
                    serverUrl={props.serverUrl}
                />
            )}
        </div>
    );
}
