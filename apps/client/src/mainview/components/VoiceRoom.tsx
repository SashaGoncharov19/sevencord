import { useEffect, useRef, useState } from "react";

interface VoiceRoomProps {
    channelId: string;
    currentUserId: string;
    onSendSignal: (type: string, content: any, targetId?: string) => void;
    incomingSignals: any[];
    onDisconnect: () => void;
    isMuted: boolean;
    isVideoOff: boolean;
    isVisible: boolean;
}

export default function VoiceRoom({ channelId, currentUserId, onSendSignal, incomingSignals, onDisconnect, isMuted, isVideoOff, isVisible }: VoiceRoomProps) {
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideosRef = useRef<HTMLDivElement>(null);
    
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
    const processedSignals = useRef<Set<string>>(new Set());

    const rtcConfig = {
        iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" }
        ]
    };

    useEffect(() => {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            console.error("navigator.mediaDevices is undefined.");
            alert("Media devices are not allowed in this environment.\n\nOn macOS: Re-build the app to apply the ATS fix.\nOn Windows: Check Settings → Privacy → Camera / Microphone and allow access for this app.");
            onDisconnect();
            return;
        }

        // Windows: listen for permission-denied event dispatched by the main process wrapper
        const handlePermissionDenied = (e: Event) => {
            const msg = (e as CustomEvent).detail || "Permission denied";
            alert(`Camera/Microphone access was blocked.\n\nOn Windows, go to:\nSettings → Privacy & Security → Camera / Microphone\nand make sure this app is allowed.\n\nError: ${msg}`);
            onDisconnect();
        };
        window.addEventListener("media-permission-denied", handlePermissionDenied);

        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            .then(stream => {
                setLocalStream(stream);
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = stream;
                }
                onSendSignal("JOIN_VOICE", { peerId: currentUserId }, undefined);
            })
            .catch(e => {
                console.error("Error accessing media devices", e);
                alert("Cannot access microphone/camera. Please grant permissions.");
                onDisconnect();
            });

        return () => {
            window.removeEventListener("media-permission-denied", handlePermissionDenied);
            if (localStream) {
                localStream.getTracks().forEach(track => track.stop());
            }
            onSendSignal("LEAVE_VOICE", {}, undefined);
            for (const pc of peerConnections.current.values()) {
                pc.close();
            }
            peerConnections.current.clear();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [channelId]);

    // Handle Mute / Video Toggle
    useEffect(() => {
        if (localStream) {
            localStream.getAudioTracks().forEach(track => {
                track.enabled = !isMuted;
            });
            localStream.getVideoTracks().forEach(track => {
                track.enabled = !isVideoOff;
            });
        }
    }, [isMuted, isVideoOff, localStream]);

    const getOrCreatePeerConnection = (targetId: string, isInitiator: boolean) => {
        if (peerConnections.current.has(targetId)) {
            return peerConnections.current.get(targetId)!;
        }

        const pc = new RTCPeerConnection(rtcConfig);
        peerConnections.current.set(targetId, pc);

        if (localStream) {
            localStream.getTracks().forEach(track => {
                pc.addTrack(track, localStream);
            });
        }

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                onSendSignal("WEBRTC_ICE_CANDIDATE", event.candidate, targetId);
            }
        };

        pc.ontrack = (event) => {
            let remoteMedia = document.getElementById(`remote-video-${targetId}`) as HTMLVideoElement;
            if (!remoteMedia) {
                remoteMedia = document.createElement("video");
                remoteMedia.id = `remote-video-${targetId}`;
                remoteMedia.autoplay = true;
                remoteMedia.playsInline = true;
                remoteMedia.className = "w-full h-full object-cover rounded-xl bg-gray-900 border border-gray-700 shadow-md aspect-video";
                if (remoteVideosRef.current) {
                    const wrapper = document.createElement("div");
                    wrapper.className = "relative rounded-xl overflow-hidden";
                    wrapper.id = `wrapper-${targetId}`;
                    
                    const label = document.createElement("div");
                    label.className = "absolute bottom-3 left-3 bg-gray-900/80 text-white px-2 py-1 rounded text-xs font-semibold backdrop-blur-sm";
                    label.innerText = `User ID: ${targetId.slice(0, 4)}`;
                    
                    wrapper.appendChild(remoteMedia);
                    wrapper.appendChild(label);
                    remoteVideosRef.current.appendChild(wrapper);
                }
            }
            remoteMedia.srcObject = event.streams[0];
        };

        pc.oniceconnectionstatechange = () => {
            if (pc.iceConnectionState === "disconnected" || pc.iceConnectionState === "failed" || pc.iceConnectionState === "closed") {
                const wrapper = document.getElementById(`wrapper-${targetId}`);
                if (wrapper) wrapper.remove();
                pc.close();
                peerConnections.current.delete(targetId);
            }
        };

        if (isInitiator) {
            pc.createOffer()
                .then(offer => pc.setLocalDescription(offer))
                .then(() => {
                    onSendSignal("WEBRTC_OFFER", pc.localDescription, targetId);
                })
                .catch(e => console.error("Error creating offer", e));
        }

        return pc;
    };

    useEffect(() => {
        const handleSignals = async () => {
            for (const sig of incomingSignals) {
                const sigId = sig.id || JSON.stringify(sig);
                if (processedSignals.current.has(sigId)) continue;
                processedSignals.current.add(sigId);

                const { type, content, senderId, targetId } = sig;
                
                if (senderId === currentUserId) continue;

                if (type === "USER_JOINED_VOICE") {
                    getOrCreatePeerConnection(content.id, true);
                } else if (type === "USER_LEFT_VOICE") {
                    const pc = peerConnections.current.get(content.id);
                    if (pc) {
                        pc.close();
                        peerConnections.current.delete(content.id);
                        const wrapper = document.getElementById(`wrapper-${content.id}`);
                        if (wrapper) wrapper.remove();
                    }
                } else if (type === "WEBRTC_OFFER" && targetId === currentUserId) {
                    const pc = getOrCreatePeerConnection(senderId, false);
                    await pc.setRemoteDescription(new RTCSessionDescription(content));
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                    onSendSignal("WEBRTC_ANSWER", pc.localDescription, senderId);
                } else if (type === "WEBRTC_ANSWER" && targetId === currentUserId) {
                    const pc = peerConnections.current.get(senderId);
                    if (pc) {
                        await pc.setRemoteDescription(new RTCSessionDescription(content));
                    }
                } else if (type === "WEBRTC_ICE_CANDIDATE" && targetId === currentUserId) {
                    const pc = peerConnections.current.get(senderId);
                    if (pc) {
                        try {
                            await pc.addIceCandidate(new RTCIceCandidate(content));
                        } catch (e) {
                            console.error("Error adding ice candidate:", e);
                        }
                    }
                }
            }
        };

        handleSignals();
    }, [incomingSignals, currentUserId]);

    return (
        <div className={`flex-1 flex flex-col items-center justify-center p-6 bg-gray-800 absolute inset-0 z-40 overflow-y-auto ${!isVisible ? 'hidden' : ''}`}>
            <div className="w-full max-w-6xl h-full flex flex-col">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <svg className="w-6 h-6 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z"></path>
                            <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z"></path>
                        </svg>
                        Voice Channel: <span className="text-gray-400 capitalize">{channelId}</span>
                    </h2>
                    <button 
                        onClick={onDisconnect}
                        className="px-4 py-2 bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
                        </svg>
                        Disconnect
                    </button>
                </div>
                
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" ref={remoteVideosRef}>
                    <div className="relative rounded-xl overflow-hidden aspect-video bg-gray-800 shadow-md border border-gray-700">
                        <video 
                            ref={localVideoRef} 
                            autoPlay 
                            muted 
                            playsInline 
                            className={`w-full h-full object-cover mirror transform scale-x-[-1] transition-opacity ${isVideoOff ? 'opacity-0' : 'opacity-100'}`} 
                        />
                        {isVideoOff && (
                            <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-gray-400">
                                <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3l18 18" />
                                </svg>
                            </div>
                        )}
                        <div className="absolute bottom-3 left-3 bg-indigo-500 text-white px-2 py-1 rounded text-xs font-semibold shadow border border-indigo-400 flex items-center gap-1.5">
                            <div className={`w-2 h-2 rounded-full ${isMuted ? 'bg-red-500' : 'bg-green-400 animate-pulse'}`}></div>
                            You (Local)
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
