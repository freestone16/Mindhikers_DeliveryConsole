import React from 'react';
import { MessageCircle } from 'lucide-react';

interface ChatToggleButtonProps {
    onClick: () => void;
    hasUnread?: boolean;
}

export const ChatToggleButton: React.FC<ChatToggleButtonProps> = ({
    onClick,
    hasUnread = false
}) => {
    return (
        <button
            onClick={onClick}
            className="fixed bottom-20 right-6 w-12 h-12 bg-blue-600 hover:bg-blue-500 rounded-full shadow-lg flex items-center justify-center transition-colors z-50"
            title="打开对话面板"
        >
            <MessageCircle className="w-5 h-5 text-white" />
            {hasUnread && (
                <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-[#060b14]" />
            )}
        </button>
    );
};
