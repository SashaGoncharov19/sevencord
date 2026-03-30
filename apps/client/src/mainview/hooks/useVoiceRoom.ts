import { useEffect, useRef, useState } from "react";
import { playSelfJoin, playSelfLeave, playUserJoin, playUserLeave } from "../utils/soundFX";

export interface RoomUser {
    username: string;
    isVideoOff: boolean;
    isMuted: boolean;
    isScreenSharing?: boolean;
}

interface UseVoiceRoomProps {
    channelId: string;
    currentUserId: string;
    onSendSignal: (type: string, content: any, targetId?: string) => void;
    incomingSignals: any[];
    onDisconnect: () => void;
    isMuted: boolean;
    isVideoOff: boolean;
    audioDeviceId?: string;
    videoDeviceId?: string;
    videoQuality?: string;
    noiseSuppression?: boolean;
    echoCancellation?: boolean;
    onStatusChange?: (status: 'connecting' | 'connected' | 'error') => void;
}

export function useVoiceRoom({
    channelId,
    currentUserId,
    onSendSignal,
    incomingSignals,
    onDisconnect,
    isMuted,
    isVideoOff,
    audioDeviceId,
    videoDeviceId,
    videoQuality,
    noiseSuppression,
    echoCancellation,
    onStatusChange
}: UseVoiceRoomProps) {
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
    const [roomUsers, setRoomUsers] = useState<Record<string, RoomUser>>({});
    const [pinnedUserId, setPinnedUserId] = useState<string | null>(null);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const screenStreamRef = useRef<MediaStream | null>(null);
    const cameraTrackRef = useRef<MediaStreamTrack | null>(null);
    const connectedAt = useRef<number | null>(null);

    const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
    const processedSignals = useRef<Set<string>>(new Set());
    const candidateQueue = useRef<Record<string, RTCIceCandidateInit[]>>({});

    const rtcConfig = {
        iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" }
        ]
    };

    const addTracksToPC = (pc: RTCPeerConnection, stream: MediaStream) => {
        const existingSenders = pc.getSenders();
        if (existingSenders.length > 0) return;

        stream.getTracks().forEach(track => {
            const sender = pc.addTrack(track, stream);
            try {
                const params = sender.getParameters();
                if (!params.encodings) params.encodings = [{}];
                if (track.kind === "video") params.encodings[0].maxBitrate = 4000000;
                else if (track.kind === "audio") params.encodings[0].maxBitrate = 128000;
                sender.setParameters(params).catch(e => console.warn(e));
            } catch (e) { }
        });
    };

    useEffect(() => {
        let isMounted = true;

        console.log(`[VoiceRoom] MOUNT: channelId=${channelId}, currentUserId=${currentUserId}`);

        processedSignals.current.clear();
        candidateQueue.current = {};

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
            };
        } else {
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

        let retryTimeout: ReturnType<typeof setTimeout>;

        const attemptConnection = () => {
            onStatusChange?.('connecting');

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
                    onStatusChange?.('connected');
                    if (!connectedAt.current) connectedAt.current = Date.now();
                    playSelfJoin();
                    localStreamRef.current = stream;
                    setLocalStream(stream);
                    onSendSignal("JOIN_VOICE", { peerId: currentUserId }, undefined);
                    onSendSignal("MEDIA_STATE_CHANGED", { isVideoOff, isMuted }, undefined);
                })
                .catch(e => {
                    if (!isMounted) return;
                    onStatusChange?.('error');
                    console.error("Error accessing media devices", e);
                    retryTimeout = setTimeout(() => {
                        if (isMounted) attemptConnection();
                    }, 5000);
                });
        };

        attemptConnection();

        return () => {
            isMounted = false;
            clearTimeout(retryTimeout);
            console.log(`[VoiceRoom] UNMOUNT/CLEANUP: channelId=${channelId}`);
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

    useEffect(() => {
        if (localStream) {
            localStream.getAudioTracks().forEach(track => {
                track.enabled = !isMuted;
            });
            if (!isScreenSharing) {
                localStream.getVideoTracks().forEach(track => {
                    track.enabled = !isVideoOff;
                });
            }
            onSendSignal("MEDIA_STATE_CHANGED", { isVideoOff, isMuted }, undefined);
        }
    }, [isMuted, isVideoOff, localStream, onSendSignal, isScreenSharing]);

    const mungeSDP = (sdp?: string) => {
        if (!sdp) return sdp;
        return sdp.replace(/(a=fmtp:\d+ .*)/g, (match) => {
            if (match.includes("apt=")) return match;
            return match + ";stereo=1;sprop-stereo=1;maxaveragebitrate=510000;cbr=1";
        });
    };

    const toggleScreenShare = async () => {
        if (isScreenSharing) {
            if (screenStreamRef.current) {
                screenStreamRef.current.getTracks().forEach(t => t.stop());
                screenStreamRef.current = null;
            }
            const camTrack = cameraTrackRef.current;
            if (camTrack) {
                for (const pc of peerConnections.current.values()) {
                    const videoSender = pc.getSenders().find(s => s.track?.kind === 'video' || (s.track === null && cameraTrackRef.current));
                    if (videoSender) {
                        await videoSender.replaceTrack(camTrack).catch(console.error);
                    }
                }
                if (localStreamRef.current) {
                    const oldVideoTrack = localStreamRef.current.getVideoTracks()[0];
                    if (oldVideoTrack) localStreamRef.current.removeTrack(oldVideoTrack);
                    localStreamRef.current.addTrack(camTrack);
                    setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
                }
            }
            setIsScreenSharing(false);
            onSendSignal("SCREEN_SHARE_CHANGED", { isSharing: false }, undefined);
            return;
        }

        try {
            if (!navigator.mediaDevices.getDisplayMedia) {
                alert("Screen sharing is not supported on this platform. On macOS, screen sharing requires running with the Chromium engine (CEF). Please contact the developer.");
                return;
            }

            const screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: { cursor: "always" } as any,
                audio: false
            });
            screenStreamRef.current = screenStream;
            const screenTrack = screenStream.getVideoTracks()[0];

            if (localStreamRef.current) {
                cameraTrackRef.current = localStreamRef.current.getVideoTracks()[0] || null;
            }

            for (const [peerId, pc] of peerConnections.current.entries()) {
                const videoSender = pc.getSenders().find(s => s.track?.kind === 'video');
                if (videoSender) {
                    await videoSender.replaceTrack(screenTrack).catch(console.error);
                } else {
                    pc.addTrack(screenTrack, screenStreamRef.current!);
                    try {
                        const offer = await pc.createOffer();
                        offer.sdp = mungeSDP(offer.sdp);
                        await pc.setLocalDescription(offer);
                        onSendSignal("WEBRTC_OFFER", pc.localDescription, peerId);
                    } catch (e) {
                        console.error("Screen share renegotiation failed:", e);
                    }
                }
            }

            if (localStreamRef.current) {
                const oldVideoTrack = localStreamRef.current.getVideoTracks()[0];
                if (oldVideoTrack) localStreamRef.current.removeTrack(oldVideoTrack);
                localStreamRef.current.addTrack(screenTrack);
            }
            setLocalStream(new MediaStream((localStreamRef.current || screenStreamRef.current!).getTracks()));

            setIsScreenSharing(true);
            onSendSignal("SCREEN_SHARE_CHANGED", { isSharing: true }, undefined);

            screenTrack.onended = () => {
                toggleScreenShare();
            };
        } catch (e) {
            console.warn("Screen share cancelled or failed:", e);
        }
    };

    useEffect(() => {
        return () => {
            if (screenStreamRef.current) {
                screenStreamRef.current.getTracks().forEach(t => t.stop());
                screenStreamRef.current = null;
            }
        };
    }, []);

    const getOrCreatePeerConnection = (targetId: string, isInitiator: boolean) => {
        if (peerConnections.current.has(targetId)) {
            return peerConnections.current.get(targetId)!;
        }

        const pc = new RTCPeerConnection(rtcConfig);
        peerConnections.current.set(targetId, pc);

        const stream = localStreamRef.current;
        if (stream) {
            addTracksToPC(pc, stream);
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

        if (isInitiator && stream) {
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

    useEffect(() => {
        if (!localStream) return;

        const handleSignals = async () => {
            for (const sig of incomingSignals) {
                const sigId = sig.id || JSON.stringify(sig);
                if (processedSignals.current.has(sigId)) continue;
                processedSignals.current.add(sigId);

                const { type, content, senderId, targetId } = sig;

                if (senderId === currentUserId) continue;

                if (type === "VOICE_ROOM_STATE") {
                    const usersArr = content.users as { id: string, username: string }[];
                    const newRoomUsers: Record<string, RoomUser> = {};
                    for (const u of usersArr) {
                        if (u.id !== currentUserId) {
                            newRoomUsers[u.id] = { username: u.username, isVideoOff: false, isMuted: false };
                        }
                    }
                    setRoomUsers(newRoomUsers);
                } else if (type === "USER_JOINED_VOICE") {
                    if (content.id === currentUserId) continue;
                    playUserJoin();
                    setRoomUsers(prev => ({ ...prev, [content.id]: { username: content.username, isVideoOff: false, isMuted: false } }));

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
                    delete candidateQueue.current[content.id];
                } else if (type === "MEDIA_STATE_CHANGED" && senderId) {
                    setRoomUsers(prev => {
                        if (!prev[senderId]) return prev;
                        return { ...prev, [senderId]: { ...prev[senderId], ...content } };
                    });
                } else if (type === "SCREEN_SHARE_CHANGED" && senderId) {
                    const sharing = content.isSharing as boolean;
                    setRoomUsers(prev => {
                        if (!prev[senderId]) return prev;
                        return { ...prev, [senderId]: { ...prev[senderId], isScreenSharing: sharing } };
                    });
                    if (sharing) {
                        setPinnedUserId(senderId);
                    } else if (pinnedUserId === senderId) {
                        setPinnedUserId(null);
                    }
                } else if (type === "WEBRTC_OFFER" && targetId === currentUserId) {
                    const existingPc = peerConnections.current.get(senderId);
                    if (existingPc) {
                        existingPc.close();
                        peerConnections.current.delete(senderId);
                    }

                    const pc = getOrCreatePeerConnection(senderId, false);
                    await pc.setRemoteDescription(new RTCSessionDescription(content));
                    const answer = await pc.createAnswer();
                    answer.sdp = mungeSDP(answer.sdp);
                    await pc.setLocalDescription(answer);
                    onSendSignal("WEBRTC_ANSWER", pc.localDescription, senderId);

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
                        if (candidateQueue.current[senderId]) {
                            for (const c of candidateQueue.current[senderId]) {
                                pc.addIceCandidate(new RTCIceCandidate(c)).catch(console.error);
                            }
                            delete candidateQueue.current[senderId];
                        }
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
                        if (!candidateQueue.current[senderId]) candidateQueue.current[senderId] = [];
                        candidateQueue.current[senderId].push(content);
                    }
                }
            }
        };

        handleSignals();
    }, [incomingSignals, currentUserId, localStream]);

    const togglePin = (id: string) => {
        setPinnedUserId(prev => prev === id ? null : id);
    };

    const getConnectionStats = async () => {
        const stats: any = {};
        for (const [peerId, pc] of peerConnections.current.entries()) {
            try {
                const results = await pc.getStats();
                const peerStats: any = { rtt: 0, bytesSent: 0, bytesReceived: 0, codec: 'unknown', localIce: 'unknown', remoteIce: 'unknown' };
                results.forEach(report => {
                    if (report.type === 'candidate-pair' && report.state === 'succeeded') {
                        peerStats.rtt = Math.round((report.currentRoundTripTime || 0) * 1000);
                        peerStats.bytesSent = report.bytesSent || 0;
                        peerStats.bytesReceived = report.bytesReceived || 0;
                    }
                    if (report.type === 'remote-candidate' && peerStats.remoteIce === 'unknown') {
                        peerStats.remoteIce = report.candidateType || 'unknown';
                    }
                    if (report.type === 'local-candidate' && peerStats.localIce === 'unknown') {
                        peerStats.localIce = report.candidateType || 'unknown';
                    }
                    if (report.type === 'codec' && report.mimeType) {
                        peerStats.codec = report.mimeType.split('/')[1];
                    }
                });
                stats[peerId] = peerStats;
            } catch (e) {
                console.error("Failed to get stats for peer", peerId, e);
            }
        }
        return {
            connectedAt: connectedAt.current,
            peers: stats
        };
    };

    return {
        localStream,
        remoteStreams,
        roomUsers,
        pinnedUserId,
        isScreenSharing,
        toggleScreenShare,
        togglePin,
        getConnectionStats
    };
}
