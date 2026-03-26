import { useState, useEffect } from "react";
import { Electroview } from "electrobun/view";
import type { UpdaterRPC } from "../../shared/rpc";

const rpc = Electroview.defineRPC<UpdaterRPC>({
    handlers: {
        requests: {},
        messages: {
            updateProgress: ({ progress }) => {
                // We'll update a global variable or custom event since this handler runs outside the component lifecycle
                window.dispatchEvent(new CustomEvent("updater-progress", { detail: progress }));
            }
        }
    }
});

const electroview = new Electroview({ rpc });

export default function UpdaterScreen() {
    const [status, setStatus] = useState<string>("Initializing Auto-Updater...");
    const [progress, setProgress] = useState<number | null>(null);

    useEffect(() => {
        const handleProgress = (e: Event) => {
            const p = (e as CustomEvent).detail;
            setProgress(p);
            setStatus(`Downloading update: ${p}%`);
        };
        window.addEventListener("updater-progress", handleProgress);

        return () => window.removeEventListener("updater-progress", handleProgress);
    }, []);

    useEffect(() => {
        const runUpdateCheck = async () => {
            try {
                setStatus("Checking for updates...");
                const checkRes = await electroview.rpc?.request.checkUpdate({}) || { updateAvailable: false, error: "RPC failed" };
                
                if (checkRes.updateAvailable) {
                    setStatus(`Update ${checkRes.version || ''} found! Starting download...`);
                    await electroview.rpc?.request.downloadUpdate({});
                    setStatus("Update ready! Restarting...");
                    await new Promise(r => setTimeout(r, 1000));
                    await electroview.rpc?.request.applyUpdate({});
                } else {
                    if (checkRes.error) {
                        setStatus(`Update check failed: ${checkRes.error}`);
                        await new Promise(r => setTimeout(r, 1500));
                    } else {
                        setStatus("You are on the latest version.");
                        await new Promise(r => setTimeout(r, 500));
                    }
                    // Continue to main app
                    await electroview.rpc?.request.continueToMain({});
                }
            } catch (err) {
                setStatus("Failed to communicate with updater process.");
                console.error(err);
                setTimeout(() => {
                    electroview.rpc?.request.continueToMain({}).catch(console.error);
                }, 2000);
            }
        };

        runUpdateCheck();
    }, []);

    return (
        <div className="w-screen h-screen bg-gray-900 border border-gray-700 flex flex-col items-center justify-center p-6 text-gray-200 select-none drag-region">
            <svg className="w-16 h-16 text-indigo-500 animate-pulse mb-6 drop-shadow-lg" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
            </svg>
            <h1 className="text-xl font-bold mb-2">SevenCord</h1>
            <p className="text-sm text-gray-400 font-mono mb-6">{status}</p>
            
            {progress !== null && (
                <div className="w-full max-w-xs bg-gray-800 rounded-full h-2 mb-4 overflow-hidden border border-gray-700">
                    <div className="bg-indigo-500 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                </div>
            )}
        </div>
    );
}
