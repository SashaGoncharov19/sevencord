import { useEffect, useRef, useState } from "react";
import { playSelfJoin, playSelfLeave, playUserJoin, playUserLeave } from "../utils/soundFX";

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
}

interface RoomUser {
    username: string;
    isVideoOff: boolean;
    isMuted: boolean;
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
                <span className="truncate">{username} {isLocal && '(You)'}</span>
            </div>
            {!isPinned && (
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-black/50 p-1.5 rounded-lg text-white backdrop-blur transition-opacity">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l5-5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                </div>
            )}
            {isPinned && (
                <div className="absolute top-4 right-4 bg-black/50 p-2 rounded-lg text-white backdrop-blur cursor-pointer hover:bg-black/70 transition-colors" title="Unpin">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                </div>
            )}
        </div>
    );
}

export default function VoiceRoom({ channelId, currentUserId, onSendSignal, incomingSignals, onDisconnect, isMuted, isVideoOff, onToggleMute, onToggleVideo, isVisible, audioDeviceId, videoDeviceId, videoQuality, noiseSuppression, echoCancellation }: VoiceRoomProps) {
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
    const [roomUsers, setRoomUsers] = useState<Record<string, RoomUser>>({});
    const [pinnedUserId, setPinnedUserId] = useState<string | null>(null);
    
    const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
    const processedSignals = useRef<Set<string>>(new Set());

    const rtcConfig = {
        iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" }
        ]
    };

    useEffect(() => {
        let isMounted = true;

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            console.error("navigator.mediaDevices is undefined.");
            alert("Media devices are not allowed in this environment.");
            onDisconnect();
            return;
        }

        const shouldEnableNS = noiseSuppression ?? true;
        const shouldEnableEC = echoCancellation ?? true;

        let audioConstraints: any;
        if (shouldEnableNS || shouldEnableEC) {
            audioConstraints = {
                echoCancellation: shouldEnableEC,
                noiseSuppression: shouldEnableNS,
                autoGainControl: true
                // Note: Enforcing sampleRate or channelCount here disables Chromium's native AEC/NS!
            };
        } else {
            // "Studio Mode": Bypass all browser processing for raw stereo quality
            audioConstraints = {
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false,
                sampleRate: 48000,
                channelCount: 2
            };
        }
        
        if (audioDeviceId && audioDeviceId !== "default") {
            audioConstraints.deviceId = { exact: audioDeviceId };
        }

        let videoConstraints: any = true;
        if (videoQuality === "1080p") {
            videoConstraints = { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } };
        } else if (videoQuality === "720p") {
            videoConstraints = { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } };
        } else if (videoQuality === "360p") {
            videoConstraints = { width: { ideal: 640 }, height: { ideal: 360 }, frameRate: { ideal: 24 } };
        } else if (videoQuality === "auto") {
            videoConstraints = true;
        }

        if (videoDeviceId && videoDeviceId !== "default") {
            if (videoConstraints === true) videoConstraints = {};
            videoConstraints.deviceId = { exact: videoDeviceId };
        }

        navigator.mediaDevices.getUserMedia({ video: videoConstraints, audio: audioConstraints })
            .catch(e => {
                console.warn("[VoiceRoom] Both video/audio failed, attempting audio-only fallback...", e);
                return navigator.mediaDevices.getUserMedia({ video: false, audio: audioConstraints });
            })
            .then(stream => {
                if (!isMounted) {
                    stream.getTracks().forEach(track => track.stop());
                    return;
                }
                playSelfJoin();
                localStreamRef.current = stream;
                setLocalStream(stream);
                onSendSignal("JOIN_VOICE", { peerId: currentUserId }, undefined);
                // Immediately broadcast our media state
                onSendSignal("MEDIA_STATE_CHANGED", { isVideoOff, isMuted }, undefined);
            })
            .catch(e => {
                if (!isMounted) return;
                console.error("Error accessing media devices", e);
                alert("Cannot access microphone/camera. Please ensure your device has a working microphone and permissions are granted.");
                onDisconnect();
            });

        return () => {
            isMounted = false;
            if (localStreamRef.current) {
                playSelfLeave();
                localStreamRef.current.getTracks().forEach(track => track.stop());
                localStreamRef.current = null;
            }
            onSendSignal("LEAVE_VOICE", {}, undefined);
            for (const pc of peerConnections.current.values()) {
                pc.close();
            }
            peerConnections.current.clear();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [channelId]);

    // Handle Mute / Video Toggle Locally and Broadcast
    useEffect(() => {
        if (localStream) {
            localStream.getAudioTracks().forEach(track => {
                track.enabled = !isMuted;
            });
            localStream.getVideoTracks().forEach(track => {
                track.enabled = !isVideoOff;
            });
            onSendSignal("MEDIA_STATE_CHANGED", { isVideoOff, isMuted }, undefined);
        }
    }, [isMuted, isVideoOff, localStream, onSendSignal]);

    const mungeSDP = (sdp?: string) => {
        if (!sdp) return sdp;
        return sdp.replace(/(a=fmtp:\d+ .*)/g, (match) => {
            if (match.includes("apt=")) return match; // Skip RTX/dummy payloads
            return match + ";stereo=1;sprop-stereo=1;maxaveragebitrate=510000;cbr=1";
        });
    };

    const getOrCreatePeerConnection = (targetId: string, isInitiator: boolean) => {
        if (peerConnections.current.has(targetId)) {
            return peerConnections.current.get(targetId)!;
        }

        const pc = new RTCPeerConnection(rtcConfig);
        peerConnections.current.set(targetId, pc);

        if (localStream) {
            localStream.getTracks().forEach(track => {
                const sender = pc.addTrack(track, localStream);
                // Boost bitrate dynamically for better quality
                try {
                    const params = sender.getParameters();
                    if (!params.encodings) params.encodings = [{}];
                    if (track.kind === "video") params.encodings[0].maxBitrate = 4000000;
                    else if (track.kind === "audio") params.encodings[0].maxBitrate = 128000;
                    sender.setParameters(params).catch(e => console.warn(e));
                } catch (e) { }
            });
        }

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                onSendSignal("WEBRTC_ICE_CANDIDATE", event.candidate, targetId);
            }
        };

        pc.ontrack = (event) => {
            setRemoteStreams(prev => ({ ...prev, [targetId]: event.streams[0] }));
        };

        pc.oniceconnectionstatechange = () => {
            if (pc.iceConnectionState === "disconnected" || pc.iceConnectionState === "failed" || pc.iceConnectionState === "closed") {
                setRemoteStreams(prev => {
                    const copy = { ...prev };
                    delete copy[targetId];
                    return copy;
                });
                pc.close();
                peerConnections.current.delete(targetId);
            }
        };

        if (isInitiator) {
            pc.createOffer()
                .then(offer => {
                    offer.sdp = mungeSDP(offer.sdp);
                    return pc.setLocalDescription(offer);
                })
                .then(() => {
                    onSendSignal("WEBRTC_OFFER", pc.localDescription, targetId);
                })
                .catch(e => console.error("Error creating offer", e));
        }

        return pc;
    };

    // Buffer for ICE candidates that arrive before the peer connection is fully negotiated
    const candidateQueue = useRef<Record<string, RTCIceCandidateInit[]>>({});

    useEffect(() => {
        const handleSignals = async () => {
            for (const sig of incomingSignals) {
                const sigId = sig.id || JSON.stringify(sig);
                if (processedSignals.current.has(sigId)) continue;
                processedSignals.current.add(sigId);

                const { type, content, senderId, targetId } = sig;
                
                if (senderId === currentUserId) continue;

                if (type === "VOICE_ROOM_STATE") {
                    const usersArr = content.users as {id: string, username: string}[];
                    const newRoomUsers = { ...roomUsers };
                    for (const u of usersArr) {
                        if (u.id !== currentUserId) {
                            newRoomUsers[u.id] = { username: u.username, isVideoOff: false, isMuted: false };
                        }
                    }
                    setRoomUsers(newRoomUsers);
                } else if (type === "USER_JOINED_VOICE") {
                    // New user joined. Add them and initiate WebRTC.
                    playUserJoin();
                    setRoomUsers(prev => ({ ...prev, [content.id]: { username: content.username, isVideoOff: false, isMuted: false } }));
                    
                    // Kill any "ghost" connections if the user abruptly disconnected previously
                    const ghostPc = peerConnections.current.get(content.id);
                    if (ghostPc) {
                        ghostPc.close();
                        peerConnections.current.delete(content.id);
                    }
                    delete candidateQueue.current[content.id];
                    
                    getOrCreatePeerConnection(content.id, true);
                } else if (type === "USER_LEFT_VOICE") {
                    playUserLeave();
                    setRoomUsers(prev => {
                        const copy = { ...prev };
                        delete copy[content.id];
                        return copy;
                    });
                    setRemoteStreams(prev => {
                        const copy = { ...prev };
                        delete copy[content.id];
                        return copy;
                    });
                    if (pinnedUserId === content.id) setPinnedUserId(null);
                    
                    const pc = peerConnections.current.get(content.id);
                    if (pc) {
                        pc.close();
                        peerConnections.current.delete(content.id);
                    }
                } else if (type === "MEDIA_STATE_CHANGED" && senderId) {
                    setRoomUsers(prev => {
                        if (!prev[senderId]) return prev;
                        return { ...prev, [senderId]: { ...prev[senderId], ...content } };
                    });
                } else if (type === "WEBRTC_OFFER" && targetId === currentUserId) {
                    const pc = getOrCreatePeerConnection(senderId, false);
                    await pc.setRemoteDescription(new RTCSessionDescription(content));
                    const answer = await pc.createAnswer();
                    answer.sdp = mungeSDP(answer.sdp);
                    await pc.setLocalDescription(answer);
                    onSendSignal("WEBRTC_ANSWER", pc.localDescription, senderId);
                    
                    // Drain any queued ICE candidates that arrived early
                    if (candidateQueue.current[senderId]) {
                        for (const c of candidateQueue.current[senderId]) {
                            pc.addIceCandidate(new RTCIceCandidate(c)).catch(console.error);
                        }
                        delete candidateQueue.current[senderId];
                    }
                } else if (type === "WEBRTC_ANSWER" && targetId === currentUserId) {
                    const pc = peerConnections.current.get(senderId);
                    if (pc) {
                        await pc.setRemoteDescription(new RTCSessionDescription(content));
                    }
                } else if (type === "WEBRTC_ICE_CANDIDATE" && targetId === currentUserId) {
                    const pc = peerConnections.current.get(senderId);
                    if (pc && pc.remoteDescription) {
                        try {
                            await pc.addIceCandidate(new RTCIceCandidate(content));
                        } catch (e) {
                            console.error("Error adding ice candidate:", e);
                        }
                    } else {
                        // Queue it until remoteDescription is fully set
                        if (!candidateQueue.current[senderId]) candidateQueue.current[senderId] = [];
                        candidateQueue.current[senderId].push(content);
                    }
                }
            }
        };

        handleSignals();
    }, [incomingSignals, currentUserId]);

    const togglePin = (id: string) => {
        setPinnedUserId(prev => prev === id ? null : id);
    };

    // Prepare all video items (local + remotes)
    const items = [
        { id: currentUserId, stream: localStream, username: 'You', isVideoOff, isMuted, isLocal: true },
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
        <div className={`flex-1 flex flex-col items-center p-6 bg-gray-800 overflow-hidden relative ${!isVisible ? 'hidden' : ''}`}>
            <div className="w-full flex justify-between items-center mb-4 flex-shrink-0">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-500 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z"></path>
                        <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z"></path>
                    </svg>
                    Voice Channel: <span className="text-gray-400 capitalize">{channelId}</span>
                </h2>
                <div className="flex gap-2 text-sm text-gray-400 bg-gray-900/50 px-3 py-1.5 rounded-full border border-gray-700/50">
                    <span className="font-semibold text-gray-200">{items.length}</span> In Call
                </div>
            </div>
            
            <div className="flex-1 w-full max-w-7xl relative">
                {renderVideoGrid()}
            </div>
            
            {/* Discord-style floating control bar */}
            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex items-center gap-4 bg-gray-900/95 backdrop-blur-md px-6 py-3 rounded-2xl shadow-xl border border-gray-700 z-50">
                <button 
                    onClick={onToggleVideo}
                    className={`w-12 h-12 flex items-center justify-center rounded-full transition-all ${isVideoOff ? 'bg-gray-800 text-red-500 hover:bg-gray-700' : 'bg-gray-700 text-white hover:bg-gray-600'}`}
                    title={isVideoOff ? "Turn on Camera" : "Turn off Camera"}
                >
                    {isVideoOff ? (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3l18 18" /></svg>
                    ) : (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                    )}
                </button>
                
                <button 
                    onClick={onToggleMute}
                    className={`w-12 h-12 flex items-center justify-center rounded-full transition-all ${isMuted ? 'bg-gray-800 text-red-500 hover:bg-gray-700' : 'bg-gray-700 text-white hover:bg-gray-600'}`}
                    title={isMuted ? "Unmute" : "Mute"}
                >
                    {isMuted ? (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3l18 18" /></svg>
                    ) : (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                    )}
                </button>

                <div className="w-[1px] h-8 bg-gray-700 mx-2"></div>

                <button 
                    onClick={onDisconnect}
                    className="w-12 h-12 flex items-center justify-center rounded-full bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all"
                    title="Disconnect"
                >
                    <svg className="w-6 h-6 transform rotate-135" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
