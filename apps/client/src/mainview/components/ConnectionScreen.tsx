import { useState } from "react";

interface ConnectionScreenProps {
	onConnect: (url: string) => void;
}

export default function ConnectionScreen({ onConnect }: ConnectionScreenProps) {
	const [url, setUrl] = useState("");

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (url.trim()) {
			onConnect(url.trim());
		}
	};

	return (
		<div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
			<div className="bg-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-md border border-gray-700">
				<div className="text-center mb-8">
					<div className="bg-indigo-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/30">
						<svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
						</svg>
					</div>
					<h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
					<p className="text-gray-400">Connect to your favorite server to see what your friends are up to.</p>
				</div>

				<form onSubmit={handleSubmit} className="space-y-6">
					<div>
						<label htmlFor="serverUrl" className="block text-sm font-medium text-gray-300 mb-2 uppercase tracking-wide">
							Server Connection URL
						</label>
						<input
							id="serverUrl"
							type="text"
							value={url}
							onChange={(e) => setUrl(e.target.value)}
							placeholder="e.g. ws://localhost:3000 or playit.gg URL"
							className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
							required
						/>
					</div>
					<button
						type="submit"
						className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-900 shadow-md"
					>
						Connect to Server
					</button>
				</form>
			</div>
		</div>
	);
}
