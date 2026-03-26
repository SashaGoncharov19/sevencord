import { useState } from "react";

interface LoginScreenProps {
	serverUrl: string;
	onLogin: (token: string, username: string) => void;
	onBack: () => void;
}

export default function LoginScreen({ serverUrl, onLogin, onBack }: LoginScreenProps) {
	const [isRegister, setIsRegister] = useState(false);
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		setLoading(true);

		try {
			const endpoint = isRegister ? "/auth/register" : "/auth/login";
			const res = await fetch(`${serverUrl}${endpoint}`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ username, password })
			});

			const data = await res.json() as { error?: string, token?: string, user?: { username: string } };

			if (!res.ok) {
				throw new Error(data.error || "Authentication failed");
			}

			if (data.token && data.user) {
				onLogin(data.token, data.user.username);
			} else {
				throw new Error("Invalid response from server");
			}
		} catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("An unknown error occurred");
            }
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 font-sans text-gray-100">
			<div className="bg-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-md border border-gray-700 relative">
				<button 
					onClick={onBack}
					className="absolute top-4 left-4 text-gray-400 hover:text-white transition-colors"
					title="Change Server"
				>
					<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
					</svg>
				</button>
				
				<div className="text-center mb-8">
					<h1 className="text-3xl font-bold text-white mb-2">{isRegister ? "Create an Account" : "Welcome Back"}</h1>
					<p className="text-gray-400 font-mono text-sm">Server: {serverUrl}</p>
				</div>

				<form onSubmit={handleSubmit} className="space-y-6">
					{error && (
						<div className="bg-red-500/10 border border-red-500 text-red-500 rounded p-3 text-sm text-center">
							{error}
						</div>
					)}
					
					<div>
						<label className="block text-xs font-bold text-gray-300 mb-2 uppercase tracking-wide">
							Username
						</label>
						<input
							type="text"
							value={username}
							onChange={(e) => setUsername(e.target.value)}
							className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
							required
						/>
					</div>
					
					<div>
						<label className="block text-xs font-bold text-gray-300 mb-2 uppercase tracking-wide">
							Password
						</label>
						<input
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
							required
						/>
					</div>

					<button
						type="submit"
						disabled={loading}
						className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
					>
						{loading ? "Please wait..." : (isRegister ? "Register" : "Login")}
					</button>
				</form>

				<div className="mt-6 text-center text-sm">
					<span className="text-gray-400">
						{isRegister ? "Already have an account?" : "Need an account?"}
					</span>
					<button 
						onClick={() => setIsRegister(!isRegister)}
						className="ml-2 text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
					>
						{isRegister ? "Login" : "Register"}
					</button>
				</div>
			</div>
		</div>
	);
}
