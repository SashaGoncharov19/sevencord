import { useState, useEffect } from "react";
import { CloseIcon, InfoIcon } from "../ui/icons";
import { IconButton } from "../ui/IconButton";

interface VoiceDebugModalProps {
    onClose: () => void;
    getConnectionStats: () => Promise<{ connectedAt: number | null, peers: Record<string, any> }>;
    serverUrl: string;
}

export function VoiceDebugModal({ onClose, getConnectionStats, serverUrl }: VoiceDebugModalProps) {
    const [stats, setStats] = useState<{ connectedAt: number | null, peers: Record<string, any> } | null>(null);
    const [bitrates, setBitrates] = useState<Record<string, { tx: number, rx: number }>>({});
    const [, setPrevBytes] = useState<Record<string, { tx: number, rx: number, ts: number }>>({});

    useEffect(() => {
        let isMounted = true;
        const interval = setInterval(async () => {
            if (!isMounted) return;
            const currentStats = await getConnectionStats();
            setStats(currentStats);
            
            const now = Date.now();
            setPrevBytes(prev => {
                const newBitrates: Record<string, { tx: number, rx: number }> = {};
                for (const peerId in currentStats.peers) {
                    const s = currentStats.peers[peerId];
                    const p = prev[peerId];
                    if (p) {
                        const dt = (now - p.ts) / 1000;
                        if (dt > 0) {
                            newBitrates[peerId] = {
                                tx: ((s.bytesSent - p.tx) * 8) / dt,
                                rx: ((s.bytesReceived - p.rx) * 8) / dt
                            };
                        }
                    }
                }
                setBitrates(newBitrates);
                
                const newPrev: Record<string, { tx: number, rx: number, ts: number }> = {};
                for (const peerId in currentStats.peers) {
                    newPrev[peerId] = {
                        tx: currentStats.peers[peerId].bytesSent,
                        rx: currentStats.peers[peerId].bytesReceived,
                        ts: now
                    };
                }
                return newPrev;
            });
            
        }, 1000);
        
        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [getConnectionStats]);

    const formatBitrate = (bps: number) => {
        if (!bps || isNaN(bps)) return "0 kbps";
        return (bps / 1000).toFixed(1) + " kbps";
    };

    const formatUptime = (ms: number | null) => {
        if (!ms) return "00:00:00";
        const diff = Date.now() - ms;
        const total = Math.floor(diff / 1000);
        const h = Math.floor(total / 3600);
        const m = Math.floor((total % 3600) / 60);
        const s = total % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const peers = stats?.peers ? Object.entries(stats.peers) : [];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md">
            <div className="bg-gray-900 border border-gray-700/50 w-[700px] max-h-[80vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center p-6 border-b border-gray-800 bg-gray-900/50">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <InfoIcon className="text-indigo-400" />
                        Voice Connection Info
                    </h3>
                    <IconButton variant="ghost" rounded="rounded-lg" className="w-8 h-8 hover:bg-gray-800 text-gray-400 hover:text-white" onClick={onClose}>
                        <CloseIcon />
                    </IconButton>
                </div>
                
                <div className="p-6 overflow-y-auto flex-1 space-y-6">
                    <div className="flex bg-gray-800 p-4 rounded-xl border border-gray-700/50 items-center justify-between">
                        <div>
                            <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Server</div>
                            <div className="text-sm font-mono text-green-400">{serverUrl}</div>
                        </div>
                        <div className="text-right">
                            <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Session Uptime</div>
                            <div className="text-sm font-mono text-gray-200">{formatUptime(stats?.connectedAt ?? null)}</div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="text-sm font-bold text-gray-300 uppercase tracking-wider px-1">WebRTC Peers ({peers.length})</div>
                        {peers.length === 0 ? (
                            <div className="text-center p-8 bg-gray-800/50 rounded-xl border border-gray-700/30 text-gray-500 text-sm">
                                No active peer connections.
                            </div>
                        ) : peers.map(([peerId, pStats]) => (
                            <div key={peerId} className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                                <div className="bg-gray-800/80 px-4 py-2 border-b border-gray-700 flex justify-between items-center">
                                    <span className="text-xs font-mono text-indigo-300">Peer: {peerId.substring(0, 8)}...</span>
                                    <span className="text-xs font-medium bg-gray-700 px-2 py-0.5 rounded text-gray-300">{pStats.rtt} ms ping</span>
                                </div>
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-4 text-sm">
                                    <div>
                                        <div className="text-[10px] text-gray-500 uppercase font-semibold mb-1">Codec</div>
                                        <div className="text-gray-200">{pStats.codec}</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-gray-500 uppercase font-semibold mb-1">ICE (L / R)</div>
                                        <div className="text-gray-200 truncate">{pStats.localIce} / {pStats.remoteIce}</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-gray-500 uppercase font-semibold mb-1">Bitrate (RX)</div>
                                        <div className="text-green-400 font-mono">{formatBitrate(bitrates[peerId]?.rx ?? 0)}</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-gray-500 uppercase font-semibold mb-1">Bitrate (TX)</div>
                                        <div className="text-indigo-400 font-mono">{formatBitrate(bitrates[peerId]?.tx ?? 0)}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
