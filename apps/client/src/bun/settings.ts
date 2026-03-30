import { homedir } from "os";
import { join } from "path";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "fs";
import type { AppSettings } from "../shared/rpc";

const SETTINGS_DIR = join(homedir(), ".sevencord");
const SETTINGS_FILE = join(SETTINGS_DIR, "settings.json");

const DEFAULT_SETTINGS: AppSettings = {
    language: "en",
    savedServers: []
};

function ensureDirExists() {
    try {
        mkdirSync(SETTINGS_DIR, { recursive: true });
    } catch (e) {
        // Assume exists or ignore
    }
}

export function readSettings(): AppSettings {
    try {
        ensureDirExists();
        if (!existsSync(SETTINGS_FILE)) {
            writeFileSync(SETTINGS_FILE, JSON.stringify(DEFAULT_SETTINGS, null, 2), "utf-8");
            return DEFAULT_SETTINGS;
        }
        const data = readFileSync(SETTINGS_FILE, "utf-8");
        const parsed = JSON.parse(data);
        return { ...DEFAULT_SETTINGS, ...parsed };
    } catch (e) {
        return DEFAULT_SETTINGS;
    }
}

export function writeSettings(settings: Partial<AppSettings>): AppSettings {
    const current = readSettings();
    const updated = { ...current, ...settings };
    try {
        ensureDirExists();
        writeFileSync(SETTINGS_FILE, JSON.stringify(updated, null, 2), "utf-8");
    } catch (e) {
        console.error("Failed to write settings", e);
    }
    return updated;
}
