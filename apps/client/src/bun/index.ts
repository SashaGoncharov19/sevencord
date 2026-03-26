import { BrowserWindow, Updater } from "electrobun/bun";

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
			console.log(
				"Vite dev server not running. Run 'bun run dev:hmr' for HMR support.",
			);
		}
	}
	return "views://mainview/index.html";
}

const url = await getMainViewUrl();

new BrowserWindow({
	title: "SevenCord",
	url,
	frame: {
		width: 1200,
		height: 800,
		x: 200,
		y: 200,
	},
	// On Windows, use CEF (Chromium Embedded Framework) instead of native
	// WebView2. CEF handles camera/microphone permission prompts like Chrome,
	// and treats views:// as a secure context for getUserMedia.
	renderer: process.platform === "win32" ? "cef" : "native",
});

console.log("7cord started!");
