import { useEffect, useMemo, useRef, useState } from 'react';
import {
    Crown,
    Download,
    Globe,
    HelpCircle,
    History,
    Info,
    LogOut,
    RefreshCcw,
} from 'lucide-react';

type MenuItem = {
    id: string;
    label: string;
    icon: typeof Download;
    tone?: 'default' | 'danger';
};

interface UserAvatarMenuProps {
    displayName: string;
    email: string;
    workspaceName?: string;
    avatarImage?: string | null;
    onOpenHistory?: () => void;
    onSignOut: () => void;
}

const MENU_ITEMS: MenuItem[] = [
    { id: 'downloads', label: '下载', icon: Download },
    { id: 'history', label: '历史对话', icon: History },
    { id: 'membership', label: '会员计划', icon: Crown },
    { id: 'about', label: '关于我们', icon: Info },
    { id: 'updates', label: '检查更新', icon: RefreshCcw },
    { id: 'help', label: 'Help', icon: HelpCircle },
    { id: 'website', label: 'MindHikers 官网', icon: Globe },
    { id: 'signout', label: '退出', icon: LogOut, tone: 'danger' },
];

const OFFICIAL_WEBSITE_URL = 'https://mindhikers-homepage-production.up.railway.app/';

export const UserAvatarMenu = ({
    displayName,
    email,
    workspaceName,
    avatarImage,
    onOpenHistory,
    onSignOut,
}: UserAvatarMenuProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const avatarText = useMemo(() => {
        const trimmed = displayName.trim() || email.trim();
        return trimmed.slice(0, 1).toUpperCase();
    }, [displayName, email]);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const handleOutsideClick = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, [isOpen]);

    useEffect(() => {
        if (!toast) {
            return;
        }

        const timer = window.setTimeout(() => setToast(null), 2200);
        return () => window.clearTimeout(timer);
    }, [toast]);

    const handleMenuAction = (item: MenuItem) => {
        setIsOpen(false);

        switch (item.id) {
            case 'history':
                if (onOpenHistory) {
                    onOpenHistory();
                    return;
                }
                setToast(`${item.label} 即将开放。`);
                return;
            case 'website':
                window.open(OFFICIAL_WEBSITE_URL, '_blank', 'noopener,noreferrer');
                return;
            case 'updates':
                setToast('当前已是最新版本。');
                return;
            case 'signout':
                void onSignOut();
                return;
            default:
                setToast(`${item.label} 即将开放。`);
        }
    };

    return (
        <div className="relative" ref={menuRef}>
            {toast ? (
                <div className="absolute right-0 top-full z-[120] mt-2 w-44 rounded-2xl border border-[rgba(166,117,64,0.12)] bg-[rgba(255,250,242,0.96)] px-3 py-2 text-[12px] text-[var(--gc-text-secondary)]">
                    {toast}
                </div>
            ) : null}

            <button
                type="button"
                onClick={() => setIsOpen((prev) => !prev)}
                className="grid h-11 w-11 place-items-center overflow-hidden rounded-2xl border border-[var(--gc-line-subtle)] bg-[var(--gc-bg-base)] transition-colors hover:border-[var(--gc-line-default)]"
                title={`${displayName} 账户菜单`}
            >
                {avatarImage ? (
                    <img src={avatarImage} alt={displayName} className="h-full w-full object-cover" />
                ) : (
                    <span className="text-sm font-semibold text-[var(--gc-text-primary)]">{avatarText}</span>
                )}
            </button>

            {isOpen ? (
                <div className="absolute right-0 top-full z-[110] mt-3 w-72 overflow-hidden rounded-[28px] border border-[var(--gc-line-subtle)] bg-[rgba(255,251,245,0.97)] backdrop-blur-xl">
                    <div className="border-b border-[var(--gc-line-subtle)] bg-[linear-gradient(180deg,rgba(255,251,245,0.98)_0%,rgba(246,236,221,0.92)_100%)] px-4 py-4">
                        <div className="flex items-center gap-3">
                            <div className="grid h-12 w-12 place-items-center overflow-hidden rounded-2xl border border-[rgba(166,117,64,0.12)] bg-[var(--gc-col-left)]">
                                {avatarImage ? (
                                    <img src={avatarImage} alt={displayName} className="h-full w-full object-cover" />
                                ) : (
                                    <span className="text-base font-semibold text-[var(--gc-text-primary)]">{avatarText}</span>
                                )}
                            </div>
                            <div className="min-w-0">
                                <div className="truncate text-sm font-semibold text-[var(--gc-text-primary)]">{displayName}</div>
                                <div className="truncate text-xs text-[var(--gc-text-tertiary)]">{email}</div>
                                {workspaceName ? (
                                    <div className="mt-1 inline-flex rounded-full border border-[rgba(166,117,64,0.12)] bg-[rgba(255,255,255,0.72)] px-2 py-0.5 text-[11px] text-[var(--gc-text-secondary)]">
                                        {workspaceName}
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-1 p-2">
                        {MENU_ITEMS.map((item) => {
                            const Icon = item.icon;
                            const isDanger = item.tone === 'danger';

                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => handleMenuAction(item)}
                                    className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm transition-colors ${
                                        isDanger
                                            ? 'text-[rgb(145,74,55)] hover:bg-[rgba(252,234,226,0.82)]'
                                            : 'text-[var(--gc-text-primary)] hover:bg-[rgba(255,255,255,0.88)]'
                                    }`}
                                >
                                    <Icon className="h-4 w-4 flex-shrink-0" />
                                    <span>{item.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            ) : null}
        </div>
    );
};
