import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { electroview } from "../../shared/rpc";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/Card";
import { IconButton } from "./ui/IconButton";
import { ConnectIcon, GlobeIcon, TrashIcon, ChevronUpIcon, ChevronDownIcon, SaveIcon } from "./ui/icons";

interface ConnectionScreenProps {
	onConnect: (url: string) => void;
}

export default function ConnectionScreen({ onConnect }: ConnectionScreenProps) {
	const { t } = useTranslation();
	const [url, setUrl] = useState("");
	const [savedServers, setSavedServers] = useState<string[]>([]);

	useEffect(() => {
		electroview.rpc?.request.getSettings({}).then((settings: any) => {
			if (settings && settings.savedServers) {
				setSavedServers(settings.savedServers);
			}
		}).catch(console.error);
	}, []);

	const updateRemoteServers = (newServers: string[]) => {
		setSavedServers(newServers);
		electroview.rpc?.request.updateSettings({ savedServers: newServers }).catch(console.error);
	};

	const handleSaveServer = () => {
		const trimmed = url.trim();
		if (trimmed && !savedServers.includes(trimmed)) {
			updateRemoteServers([...savedServers, trimmed]);
		}
	};

	const handleDeleteServer = (e: React.MouseEvent, serverToRemove: string) => {
		e.stopPropagation();
		updateRemoteServers(savedServers.filter(s => s !== serverToRemove));
	};

	const handleMoveUp = (e: React.MouseEvent, index: number) => {
		e.stopPropagation();
		if (index > 0) {
			const newArr = [...savedServers];
			[newArr[index - 1], newArr[index]] = [newArr[index], newArr[index - 1]];
			updateRemoteServers(newArr);
		}
	};

	const handleMoveDown = (e: React.MouseEvent, index: number) => {
		e.stopPropagation();
		if (index < savedServers.length - 1) {
			const newArr = [...savedServers];
			[newArr[index + 1], newArr[index]] = [newArr[index], newArr[index + 1]];
			updateRemoteServers(newArr);
		}
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (url.trim()) {
			onConnect(url.trim());
		}
	};

	return (
		<div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
			<Card className="w-full max-w-md">
				<CardHeader className="text-center pb-6">
					<div className="bg-indigo-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/30">
						<ConnectIcon className="w-8 h-8 text-white" />
					</div>
					<CardTitle className="text-3xl mb-2">{t('connection.title')}</CardTitle>
					<CardDescription>{t('connection.desc')}</CardDescription>
				</CardHeader>

				<CardContent>
					<form onSubmit={handleSubmit} className="space-y-6">
						<div className="flex items-end gap-2">
							<div className="flex-1">
								<Input
									id="serverUrl"
									label={t('connection.serverUrl')}
									type="text"
									value={url}
									onChange={(e) => setUrl(e.target.value)}
									placeholder={t('connection.serverPlaceholder')}
									required
								/>
							</div>
							<Button
								type="button"
								variant="secondary"
								className="w-[50px] h-[50px] px-0 flex-shrink-0 flex items-center justify-center hover:bg-gray-700"
								onClick={handleSaveServer}
								title={t('connection.saveServer')}
							>
								<SaveIcon className="w-5 h-5 text-gray-300" />
							</Button>
						</div>

						{savedServers.length > 0 && (
							<div className="bg-gray-800/50 rounded-xl border border-gray-700/50 overflow-hidden">
								<div className="px-3 py-2 text-xs font-semibold text-gray-400 bg-gray-900/50 border-b border-gray-700/50 uppercase tracking-wider">
									{t('connection.savedServers')}
								</div>
								<div className="max-h-40 overflow-y-auto">
									{savedServers.map((server, idx) => (
										<div
											key={idx}
											className="group flex items-center justify-between p-3 hover:bg-gray-700/50 transition-colors border-b border-gray-700/30 last:border-b-0 cursor-pointer"
											onClick={() => setUrl(server)}
										>
											<div className="flex items-center gap-3 overflow-hidden">
												<GlobeIcon className="text-indigo-400 flex-shrink-0 w-5 h-5" />
												<span className="text-sm font-medium text-gray-200 truncate" title={server}>
													{server}
												</span>
											</div>
											<div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity gap-1 flex-shrink-0">
												<div className="flex flex-col gap-0 mr-1">
													<IconButton variant="ghost" rounded="rounded" className="w-5 h-5 text-gray-400 hover:text-white hover:bg-gray-600" onClick={(e) => handleMoveUp(e, idx)} disabled={idx === 0}>
														<ChevronUpIcon className="w-3 h-3" />
													</IconButton>
													<IconButton variant="ghost" rounded="rounded" className="w-5 h-5 text-gray-400 hover:text-white hover:bg-gray-600" onClick={(e) => handleMoveDown(e, idx)} disabled={idx === savedServers.length - 1}>
														<ChevronDownIcon className="w-3 h-3" />
													</IconButton>
												</div>
												<IconButton variant="ghost" rounded="rounded" className="w-7 h-7 text-gray-400 hover:text-red-400 hover:bg-red-400/10" onClick={(e) => handleDeleteServer(e, server)} title={t('connection.delete')}>
													<TrashIcon className="w-4 h-4" />
												</IconButton>
											</div>
										</div>
									))}
								</div>
							</div>
						)}

						<Button type="submit" className="w-full mt-2">
							{t('connection.connectBtn')}
						</Button>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
