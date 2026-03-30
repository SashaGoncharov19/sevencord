import { useState, useRef, useEffect } from "react";
import { ChatMessage } from "./useChat";

export function useChatUI(
    messages: ChatMessage[], 
    sendMessage: (content: string, channelId: string) => boolean, 
    activeChannel: string
) {
    const [inputMessage, setInputMessage] = useState<string>("");
    const [isMuted, setIsMuted] = useState<boolean>(false);
    const [isVideoOff, setIsVideoOff] = useState<boolean>(true);
    const [showSettings, setShowSettings] = useState(false);
    const [showVoiceDebug, setShowVoiceDebug] = useState(false);
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedAudioInput, setSelectedAudioInput] = useState<string>("default");
    const [selectedVideoInput, setSelectedVideoInput] = useState<string>("default");
    const [videoQuality, setVideoQuality] = useState<string>("720p");
    const [noiseSuppression, setNoiseSuppression] = useState<boolean>(true);
    const [echoCancellation, setEchoCancellation] = useState<boolean>(true);
    
    const [voiceStatus, setVoiceStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
    
    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const loadDevices = async () => {
        if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
            try {
                await navigator.mediaDevices.getUserMedia({ audio: true, video: true }).catch(() => {});
                const allDevices = await navigator.mediaDevices.enumerateDevices();
                setDevices(allDevices);
            } catch (e) {
                console.error("Error enumerating devices", e);
            }
        }
    };

    const handleSendMessage = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const sent = sendMessage(inputMessage, activeChannel);
        if (sent) setInputMessage("");
    };

    return {
        inputMessage, setInputMessage,
        isMuted, setIsMuted,
        isVideoOff, setIsVideoOff,
        showSettings, setShowSettings,
        showVoiceDebug, setShowVoiceDebug,
        devices, loadDevices,
        selectedAudioInput, setSelectedAudioInput,
        selectedVideoInput, setSelectedVideoInput,
        videoQuality, setVideoQuality,
        noiseSuppression, setNoiseSuppression,
        echoCancellation, setEchoCancellation,
        messagesEndRef,
        handleSendMessage,
        voiceStatus, setVoiceStatus
    };
}
