import { useTranslation } from "react-i18next";
import { electroview } from "../../../shared/rpc";
import { Button } from "../ui/Button";
import { IconButton } from "../ui/IconButton";
import { SettingsIcon, CloseIcon, MicrophoneIcon, ChevronDownIcon, CameraIcon, AdjustmentsIcon, InfoIcon } from "../ui/icons";

interface DeviceSettingsModalProps {
    setShowSettings: (val: boolean) => void;
    devices: MediaDeviceInfo[];
    selectedAudioInput: string;
    setSelectedAudioInput: (val: string) => void;
    selectedVideoInput: string;
    setSelectedVideoInput: (val: string) => void;
    videoQuality: string;
    setVideoQuality: (val: string) => void;
    noiseSuppression: boolean;
    setNoiseSuppression: (val: boolean) => void;
    echoCancellation: boolean;
    setEchoCancellation: (val: boolean) => void;
}

export function DeviceSettingsModal({
    setShowSettings,
    devices,
    selectedAudioInput,
    setSelectedAudioInput,
    selectedVideoInput,
    setSelectedVideoInput,
    videoQuality,
    setVideoQuality,
    noiseSuppression,
    setNoiseSuppression,
    echoCancellation,
    setEchoCancellation
}: DeviceSettingsModalProps) {
    const { t, i18n } = useTranslation();

    const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const lang = e.target.value;
        i18n.changeLanguage(lang);
        electroview.rpc?.request.updateSettings({ language: lang }).catch(console.error);
    };

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-gray-800 border border-gray-700 w-[500px] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center p-6 border-b border-gray-700/50 bg-gray-900/30">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <SettingsIcon className="text-indigo-400" />
                        {t('settings.title')}
                    </h3>
                    <IconButton variant="ghost" rounded="rounded-lg" className="w-8 h-8 hover:bg-gray-700 text-gray-400 hover:text-white" onClick={() => setShowSettings(false)}>
                        <CloseIcon />
                    </IconButton>
                </div>
                
                <div className="p-6 space-y-6 flex-1 overflow-y-auto max-h-[70vh]">
                    
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-2 mb-3">
                            <SettingsIcon className="w-4 h-4" />
                            {t('settings.language')}
                        </label>
                        <div className="relative">
                            <select 
                                value={i18n.language} 
                                onChange={handleLanguageChange}
                                className="w-full bg-gray-900 border border-gray-700 text-gray-200 text-sm rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 block p-3.5 appearance-none shadow-inner"
                            >
                                <option value="en">English</option>
                                <option value="uk">Українська</option>
                                <option value="es">Español</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
                                <ChevronDownIcon />
                            </div>
                        </div>
                    </div>

                    <hr className="border-gray-700/50 my-6" />

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-2 mb-3">
                            <MicrophoneIcon className="w-4 h-4" />
                            {t('settings.microphone')}
                        </label>
                        <div className="relative">
                            <select 
                                value={selectedAudioInput} 
                                onChange={(e) => setSelectedAudioInput(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-700 text-gray-200 text-sm rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 block p-3.5 appearance-none shadow-inner"
                            >
                                <option value="default">{t('settings.sysDefault')}</option>
                                {devices.filter(d => d.kind === 'audioinput').map(device => (
                                    <option key={device.deviceId} value={device.deviceId}>{device.label || `Microphone (${device.deviceId.slice(0,5)}...)`}</option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
                                <ChevronDownIcon />
                            </div>
                        </div>
                    </div>
                    
                    <div className="space-y-2 pt-2">
                        <label className="text-sm font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-2 mb-3">
                            <CameraIcon className="w-4 h-4" />
                            {t('settings.camera')}
                        </label>
                        <div className="relative">
                            <select 
                                value={selectedVideoInput} 
                                onChange={(e) => setSelectedVideoInput(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-700 text-gray-200 text-sm rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 block p-3.5 appearance-none shadow-inner"
                            >
                                <option value="default">{t('settings.sysDefault')}</option>
                                {devices.filter(d => d.kind === 'videoinput').map(device => (
                                    <option key={device.deviceId} value={device.deviceId}>{device.label || `Camera (${device.deviceId.slice(0,5)}...)`}</option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
                                <ChevronDownIcon />
                            </div>
                        </div>
                    </div>
                    
                    <hr className="border-gray-700/50 my-6" />

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-2 mb-3">
                            <CameraIcon className="w-4 h-4" />
                            {t('settings.videoQuality')}
                        </label>
                        <div className="relative">
                            <select 
                                value={videoQuality} 
                                onChange={(e) => setVideoQuality(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-700 text-gray-200 text-sm rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 block p-3.5 appearance-none shadow-inner"
                            >
                                <option value="auto">{t('settings.auto')}</option>
                                <option value="1080p">{t('settings.q1080')}</option>
                                <option value="720p">{t('settings.q720')}</option>
                                <option value="360p">{t('settings.q360')}</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
                                <ChevronDownIcon />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-5 pt-3">
                        <label className="text-sm font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-2 mb-3">
                            <AdjustmentsIcon />
                            {t('settings.audioProc')}
                        </label>
                        
                        <label className="flex items-center justify-between cursor-pointer group bg-gray-900/50 p-4 rounded-xl border border-gray-700/50 hover:bg-gray-800 transition-colors">
                            <div>
                                <div className="text-gray-200 font-medium">{t('settings.noiseSup')}</div>
                                <div className="text-xs text-gray-400 mt-0.5 max-w-[280px]">{t('settings.noiseSupDesc')}</div>
                            </div>
                            <div className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${noiseSuppression ? 'bg-indigo-500' : 'bg-gray-700'}`}>
                                <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${noiseSuppression ? 'translate-x-5' : ''}`}></div>
                            </div>
                            <input type="checkbox" className="hidden" checked={noiseSuppression} onChange={(e) => setNoiseSuppression(e.target.checked)} />
                        </label>

                        <label className="flex items-center justify-between cursor-pointer group bg-gray-900/50 p-4 rounded-xl border border-gray-700/50 hover:bg-gray-800 transition-colors">
                            <div>
                                <div className="text-gray-200 font-medium">{t('settings.echoCanc')}</div>
                                <div className="text-xs text-gray-400 mt-0.5 max-w-[280px]">{t('settings.echoCancDesc')}</div>
                            </div>
                            <div className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${echoCancellation ? 'bg-indigo-500' : 'bg-gray-700'}`}>
                                <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${echoCancellation ? 'translate-x-5' : ''}`}></div>
                            </div>
                            <input type="checkbox" className="hidden" checked={echoCancellation} onChange={(e) => setEchoCancellation(e.target.checked)} />
                        </label>
                    </div>

                    <div className="flex bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-xl mt-4">
                        <InfoIcon className="w-5 h-5 text-indigo-400 mt-0.5 flex-shrink-0" />
                        <div className="ml-3 text-sm text-indigo-200 tracking-wide font-medium">
                            {t('settings.restartWarn')}
                        </div>
                    </div>
                </div>
                
                <div className="p-5 border-t border-gray-700/50 bg-gray-900/50 flex justify-end">
                    <Button onClick={() => setShowSettings(false)} className="w-auto px-8" variant="primary">
                        {t('settings.done')}
                    </Button>
                </div>
            </div>
        </div>
    );
}
