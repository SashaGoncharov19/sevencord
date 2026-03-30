import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Electroview } from "electrobun/view";
import type { UpdaterRPC } from "../../shared/rpc";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./ui/Card";
import { UpdateIcon } from "./ui/icons";

let electroview: any = null;
const isUpdater = typeof window !== "undefined" && (window.innerWidth < 500 || window.location.search.includes("updater") || window.location.hash.includes("updater"));

if (isUpdater) {
    const rpc = Electroview.defineRPC<UpdaterRPC>({
        handlers: {
            requests: {},
            messages: {
                updateProgress: ({ progress }: { progress: number }) => {
                    window.dispatchEvent(new CustomEvent("updater-progress", { detail: progress }));
                }
            }
        }
    });
    electroview = new Electroview({ rpc });
}

export default function UpdaterScreen() {
    const { t } = useTranslation();
    const [status, setStatus] = useState<string>("");
    const [progress, setProgress] = useState<number | null>(null);

    // Initial translation since hook cannot be used inside useEffect directly when initializing state without dependency update
    useEffect(() => {
        if (!status) setStatus(t('updater.init', "Initializing Auto-Updater..."));
    }, [t, status]);

    useEffect(() => {
        const handleProgress = (e: Event) => {
            const p = (e as CustomEvent).detail;
            setProgress(p);
            setStatus(t('updater.downloading', { progress: p, defaultValue: `Downloading update: ${p}%` }));
        };
        window.addEventListener("updater-progress", handleProgress);

        return () => window.removeEventListener("updater-progress", handleProgress);
    }, []);

    useEffect(() => {
        const runUpdateCheck = async () => {
            try {
                setStatus(t('updater.checking', "Checking for updates..."));
                const checkRes = await electroview.rpc?.request.checkUpdate({}) || { updateAvailable: false, error: "RPC failed" };
                
                if (checkRes.updateAvailable) {
                    setStatus(t('updater.found', { version: checkRes.version || '', defaultValue: `Update ${checkRes.version || ''} found! Starting download...` }));
                    await electroview.rpc?.request.downloadUpdate({});
                    setStatus(t('updater.ready', "Update ready! Restarting..."));
                    await new Promise(r => setTimeout(r, 1000));
                    await electroview.rpc?.request.applyUpdate({});
                } else {
                    if (checkRes.error) {
                        setStatus(t('updater.failed', { error: checkRes.error, defaultValue: `Update check failed: ${checkRes.error}` }));
                        await new Promise(r => setTimeout(r, 1500));
                    } else {
                        setStatus(t('updater.upToDate', "You are on the latest version."));
                        await new Promise(r => setTimeout(r, 500));
                    }
                    // Continue to main app
                    await electroview.rpc?.request.continueToMain({});
                }
            } catch (err) {
                setStatus(t('updater.commFailed', "Failed to communicate with updater process."));
                console.error(err);
                setTimeout(() => {
                    electroview.rpc?.request.continueToMain({}).catch(console.error);
                }, 2000);
            }
        };

        runUpdateCheck();
    }, []);

    return (
        <div className="w-screen h-screen bg-gray-900 flex flex-col items-center justify-center p-6 text-gray-200 select-none drag-region">
            <Card className="w-full max-w-sm text-center bg-gray-900 border-none shadow-none">
                <CardHeader>
					<UpdateIcon className="w-16 h-16 text-indigo-500 animate-pulse mx-auto mb-4 drop-shadow-lg" />
                    <CardTitle className="text-xl">SevenCord</CardTitle>
                    <CardDescription className="font-mono mt-2">{status}</CardDescription>
                </CardHeader>
                
                <CardContent>
                    {progress !== null && (
                        <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden border border-gray-700">
                            <div className="bg-indigo-500 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
