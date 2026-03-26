import { RPCSchema } from "electrobun/bun";

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
