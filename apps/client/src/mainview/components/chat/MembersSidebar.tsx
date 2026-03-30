import { useTranslation } from "react-i18next";
import { UsersIcon } from "../ui/icons";
import type { User } from "../../hooks/useChat";

interface MembersSidebarProps {
    users: User[];
}

export function MembersSidebar({ users }: MembersSidebarProps) {
    const { t } = useTranslation();

    return (
        <div className="w-60 bg-gray-800 flex-shrink-0 flex flex-col hidden lg:flex">
            <div className="h-12 shadow-sm flex items-center justify-between px-4 border-b border-gray-900/50">
                <div className="flex gap-4 text-gray-400">
                    <UsersIcon className="w-6 h-6 hover:text-gray-200 cursor-pointer" />
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
                <div className="px-2 font-semibold text-xs text-gray-400 uppercase tracking-wider mt-4 mb-1">
                    {t('chat.online', { count: users.length })}
                </div>
                {users.map((user) => (
                    <div key={user.id} className="flex items-center gap-3 p-2 hover:bg-gray-700/50 rounded cursor-pointer transition-colors group">
                        <div className="relative">
                            <div className="w-8 h-8 rounded-full bg-indigo-500 overflow-hidden">
                                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} alt="avatar" />
                            </div>
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-gray-800 rounded-full"></div>
                        </div>
                        <div className="font-medium text-[15px] group-hover:text-gray-100 text-gray-300 truncate">{user.username}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}
