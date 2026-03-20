import { useEffect, useState, useCallback } from 'react';

export const useExpertState = <T>(expertId: string, initialState: T) => {
    const [state, setState] = useState<T>(initialState);
    const [socket, setSocket] = useState<any>(null);

    useEffect(() => {
        // 监听全局挂载的 socket
        const checkSocket = setInterval(() => {
            const globalSocket = (window as any).socket;
            if (globalSocket) {
                setSocket(globalSocket);
                clearInterval(checkSocket);
            }
        }, 100);

        return () => clearInterval(checkSocket);
    }, []);

    // 使用 useCallback 确保 applyUpdate 引用稳定
    const applyUpdate = useCallback((newData: any) => {
        const actualData = newData.data !== undefined ? newData.data : newData;
        setState(actualData);
    }, []);

    useEffect(() => {
        if (!socket) return;

        // 通道 1: expert-data-update 广播（初始加载 + 正常广播）
        const updateEvent = `expert-data-update:${expertId}`;
        socket.on(updateEvent, applyUpdate);

        // 通道 2: chat-action-result 携带 expertState（最可靠的更新通道）
        // chat-action-result 一定会到达（用户能看到"操作执行成功"就证明了）
        const handleActionResult = (result: any) => {
            if (result.expertId === expertId && result.success && result.expertState) {
                console.log(`[useExpertState][${expertId}] 🎯 chat-action-result carrying fresh state, applying directly`);
                applyUpdate(result.expertState);
            }
        };
        socket.on('chat-action-result', handleActionResult);

        // 🔑 解决时序竞态：listener 注册完毕后，主动请求后端重发当前状态
        // 原因：socket connect 时后端自动发送的 hydration 数据可能在 listener 注册之前就到达了
        console.log(`[useExpertState][${expertId}] ✅ Listener registered, requesting hydration...`);
        socket.emit('request-expert-hydration', { expertId });

        return () => {
            socket.off(updateEvent, applyUpdate);
            socket.off('chat-action-result', handleActionResult);
        };
    }, [socket, expertId, applyUpdate]);

    const updateState = (projectId: string, newData: T) => {
        setState(newData);
        if (socket) {
            socket.emit('update-expert-data', { expertId, projectId, data: newData });
        }
    };

    return { state, updateState, setState };
};
