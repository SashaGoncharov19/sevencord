import { BrowserWindow, BrowserView, Updater } from "electrobun/bun";
import type { UpdaterRPC } from "../shared/rpc";

const DEV_SERVER_PORT = 5173;
const DEV_SERVER_URL = `http://localhost:${DEV_SERVER_PORT}`;

async function getMainViewUrl(): Promise<string> {
	const channel = await Updater.localInfo.channel();

	if (channel === "dev") {
		try {
			await fetch(DEV_SERVER_URL, { method: "HEAD" });
			console.log(`HMR enabled: Using Vite dev server at ${DEV_SERVER_URL}`);
			return DEV_SERVER_URL;
		} catch {
			console.log("Vite dev server not running. Run 'bun run dev:hmr' for HMR support.");
		}
	}

	return "views://mainview/index.html";
}

const url = await getMainViewUrl();

function startMainWindow() {
	new BrowserWindow({
		title: "SevenCord",
		url,
		frame: { width: 1200, height: 800, x: 200, y: 200 },
		renderer: process.platform === "win32" ? "cef" : "native",
	});

	console.log("7cord main window started!");
}

function startUpdaterWindow() {
	const rpc = BrowserView.defineRPC<UpdaterRPC>({
		handlers: {
			requests: {
				checkUpdate: async () => {
					try {
						const info = await Updater.checkForUpdate();
						return { updateAvailable: info.updateAvailable, version: info.version, error: info.error };
					} catch (e: any) {
						return { updateAvailable: false, error: e.message };
					}
				},
				downloadUpdate: async () => {
					try {
						// Simulate progress updates during download
						let p = 0;
						const interval = setInterval(() => {
							p += Math.floor(Math.random() * 10) + 5;
							if (p > 95) p = 95;
							updaterWindow.webview.rpc?.send.updateProgress({ progress: p });
						}, 300);

						await Updater.downloadUpdate();
						
						clearInterval(interval);
						updaterWindow.webview.rpc?.send.updateProgress({ progress: 100 });
						return { success: true };
					} catch (e: any) {
						return { success: false, error: e.message };
					}
				},
				applyUpdate: async () => {
					if (Updater.updateInfo()?.updateReady) {
						await Updater.applyUpdate();
					}
					return {};
				},
				continueToMain: async () => {
					startMainWindow();
					// We wait slightly before closing updater to prevent flashing
					setTimeout(() => {
						updaterWindow.close();
					}, 500);
					return {};
				}
			},
			messages: {}
		}
	});

	const updaterWindow = new BrowserWindow({
		title: "SevenCord Updater",
		url: `${url}#updater`,
		frame: { width: 400, height: 300, x: 400, y: 300 },
		rpc,
		renderer: process.platform === "win32" ? "cef" : "native",
	});
	
	console.log("7cord updater window started!");
}

async function boot() {
	const channel = await Updater.localInfo.channel();
	
	if (channel !== "dev") {
		startUpdaterWindow();
	} else {
		// Dev channel doesn't have a release url or updates available
		startMainWindow();
	}
}

boot();
