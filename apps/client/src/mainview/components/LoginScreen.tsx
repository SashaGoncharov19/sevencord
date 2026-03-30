import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./ui/Card";
import { ArrowLeftIcon } from "./ui/icons";

interface LoginScreenProps {
	serverUrl: string;
	onLogin: (token: string, username: string) => void;
	onBack: () => void;
}

export default function LoginScreen({ serverUrl, onLogin, onBack }: LoginScreenProps) {
	const { t } = useTranslation();
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
				throw new Error(data.error || t('login.authFailed', "Authentication failed"));
			}

			if (data.token && data.user) {
				onLogin(data.token, data.user.username);
			} else {
				throw new Error(t('login.invalidRes', "Invalid response from server"));
			}
		} catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError(t('login.unknownError', "An unknown error occurred"));
            }
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 font-sans text-gray-100">
			<Card className="w-full max-w-md relative">
				<button 
					onClick={onBack}
					className="absolute top-4 left-4 text-gray-400 hover:text-white transition-colors"
					title={t('login.changeServer', "Change Server")}
				>
					<ArrowLeftIcon />
				</button>
				
				<CardHeader className="text-center pt-8 pb-8">
					<CardTitle className="text-3xl mb-2">{isRegister ? t('login.createAccount', "Create an Account") : t('login.welcome', "Welcome Back")}</CardTitle>
					<CardDescription className="font-mono">{t('login.server', "Server:")} {serverUrl}</CardDescription>
				</CardHeader>

				<CardContent>
					<form onSubmit={handleSubmit} className="space-y-6">
						{error && (
							<div className="bg-red-500/10 border border-red-500 text-red-500 rounded p-3 text-sm text-center">
								{error}
							</div>
						)}
						
						<Input
							label={t('login.username', "Username")}
							type="text"
							value={username}
							onChange={(e) => setUsername(e.target.value)}
							required
						/>
						
						<Input
							label={t('login.password', "Password")}
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							required
						/>

						<Button
							type="submit"
							loading={loading}
							className="w-full"
						>
							{isRegister ? t('login.register', "Register") : t('login.loginBtn', "Login")}
						</Button>
					</form>

					<div className="mt-6 text-center text-sm">
						<span className="text-gray-400">
							{isRegister ? t('login.haveAccount', "Already have an account?") : t('login.needAccount', "Need an account?")}
						</span>
						<button 
							onClick={(e) => { e.preventDefault(); setIsRegister(!isRegister); }}
							className="ml-2 text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
						>
							{isRegister ? t('login.loginBtn', "Login") : t('login.register', "Register")}
						</button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
