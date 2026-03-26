import { useState, useEffect } from "react";
import ConnectionScreen from "./components/ConnectionScreen";
import LoginScreen from "./components/LoginScreen";
import ChatLayout from "./components/ChatLayout";

type AppState = "CONNECT_URL" | "CHECKING_URL" | "LOGIN" | "CHAT";

function App() {
	const [serverUrl, setServerUrl] = useState<string>("");
	const [token, setToken] = useState<string | null>(null);
	const [appState, setAppState] = useState<AppState>("CONNECT_URL");

	const handleConnectUrl = async (url: string) => {
		// Clean up the URL format to ensure no trailing slash, add http if missing
		let formattedUrl = url.trim();
		if (!/^https?:\/\//i.test(formattedUrl)) {
			formattedUrl = `http://${formattedUrl}`;
		}
		formattedUrl = formattedUrl.replace(/\/+$/, "");
		
		setServerUrl(formattedUrl);
		setAppState("CHECKING_URL");

		try {
			const res = await fetch(`${formattedUrl}/ping`, { method: "GET" });
			if (res.ok) {
				setAppState("LOGIN");
			} else {
				throw new Error("Server not responding correctly");
			}
		} catch (e) {
			console.error("Connection failed", e);
			alert(`Could not connect to server at ${formattedUrl}`);
			setAppState("CONNECT_URL");
		}
	};

	const handleLogin = (jwtToken: string) => {
		setToken(jwtToken);
		setAppState("CHAT");
	};

	const handleDisconnect = () => {
		setToken(null);
		setServerUrl("");
		setAppState("CONNECT_URL");
	};

	if (appState === "CONNECT_URL" || appState === "CHECKING_URL") {
		return (
			<div className="relative">
				{appState === "CHECKING_URL" && (
					<div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center">
						<div className="text-white text-xl animate-pulse">Pinging server...</div>
					</div>
				)}
				<ConnectionScreen onConnect={handleConnectUrl} />
			</div>
		);
	}

	if (appState === "LOGIN") {
		return (
			<LoginScreen 
				serverUrl={serverUrl} 
				onLogin={handleLogin} 
				onBack={() => setAppState("CONNECT_URL")} 
			/>
		);
	}

	if (appState === "CHAT" && token) {
		return (
			<ChatLayout 
				serverUrl={serverUrl} 
				token={token}
				onDisconnect={handleDisconnect} 
			/>
		);
	}

	return null;
}

export default App;
