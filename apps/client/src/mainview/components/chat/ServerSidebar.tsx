import { useTranslation } from "react-i18next";
import { DisconnectIcon } from "../ui/icons";

interface ServerSidebarProps {
    onDisconnect: () => void;
}

export function ServerSidebar({ onDisconnect }: ServerSidebarProps) {
    const { t } = useTranslation();

    return (
        <div className="w-[72px] bg-gray-900 flex-shrink-0 flex flex-col items-center py-3 space-y-2">
            <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center cursor-pointer hover:rounded-xl transition-all duration-200 shadow-md">
                <span className="font-bold text-lg">{t('chat.dm')}</span>
            </div>
            <div className="w-8 h-[2px] bg-gray-700 rounded-full my-2" />
            <div className="w-12 h-12 bg-gray-700 rounded-[24px] hover:rounded-xl hover:bg-indigo-500 transition-all duration-200 cursor-pointer flex items-center justify-center">
                <span className="font-bold">S1</span>
            </div>
            <div className="w-12 h-12 bg-gray-700 rounded-[24px] hover:rounded-xl hover:bg-green-500 transition-all duration-200 cursor-pointer flex items-center justify-center mt-auto" onClick={onDisconnect} title={t('chat.disconnect')}>
                <DisconnectIcon className="w-6 h-6" />
            </div>
        </div>
    );
}
