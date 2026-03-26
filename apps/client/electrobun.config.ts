import type { ElectrobunConfig } from "electrobun";

export default {
	app: {
		name: "7cord",
		identifier: "sevencord.entityseven.com",
		version: "0.0.1",
	},
	build: {
		targets: "win-x64,macos-arm64",
		// Vite builds to dist/, we copy from there
		copy: {
			"dist/index.html": "views/mainview/index.html",
			"dist/assets": "views/mainview/assets",
		},
		// Ignore Vite output in watch mode — HMR handles view rebuilds separately
		watchIgnore: ["dist/**"],
		mac: {
			bundleCEF: false,
			entitlements: {
				"com.apple.security.device.camera": "Required for voice and video channel communications.",
				"com.apple.security.device.audio-input": "Required for voice channel communications."
			}
		},
		linux: {
			bundleCEF: false,
		},
		win: {
			bundleCEF: false,
		},
	},
	release: {
		// The GitHub release latest/download URL works perfectly for Electrobun's updater
		// It will append `/update.json` and download the patch files from here.
		baseUrl: "https://github.com/SashaGoncharov19/sevencord/releases/latest/download",
	},
	scripts: {
		postBuild: "./scripts/postBuild.ts",
	},
} satisfies ElectrobunConfig;
