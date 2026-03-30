import { RPCSchema } from "electrobun/bun";
import { Electroview } from "electrobun/view";

export type UpdaterRPC = {
    bun: RPCSchema<{
        requests: {
            checkUpdate: { params: {}; response: { updateAvailable: boolean; version?: string; error?: string } };
            downloadUpdate: { params: {}; response: { success: boolean; error?: string } };
            applyUpdate: { params: {}; response: {} };
            continueToMain: { params: {}; response: {} };
        };
        messages: {};
    }>;
    webview: RPCSchema<{
        requests: {};
        messages: {
            updateProgress: { progress: number };
        };
    }>;
};

export interface AppSettings {
    language: string;
    savedServers: string[]; // Let's keep URLs simple, or objects? User requested: "selector of servers, add new, save, delete, reorganize"
}

export type SettingsRPC = {
    bun: RPCSchema<{
        requests: {
            getSettings: { params: {}; response: AppSettings };
            updateSettings: { params: Partial<AppSettings>; response: AppSettings };
        };
        messages: {};
    }>;
    webview: RPCSchema<{
        requests: {};
        messages: {};
    }>;
};

export const rpcSchema = Electroview.defineRPC<SettingsRPC>({
    handlers: { requests: {}, messages: {} }
});

const isUpdater = typeof window !== "undefined" && (window.innerWidth < 500 || window.location.search.includes("updater") || window.location.hash.includes("updater"));
export const electroview = (typeof window !== "undefined" && !isUpdater) ? new Electroview({ rpc: rpcSchema }) : (null as any);
