import { useEffect, useState } from 'react';

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

    useEffect(() => {
        if (!socket) return;

        const updateEvent = `expert-data-update:${expertId}`;
        const handleServerUpdate = (newData: any) => {
            // newData 可能包含 expertId 等 wrapper，取它的 data，如果没有就当作是全新 data
            const actualData = newData.data !== undefined ? newData.data : newData;
            setState(actualData);
        };

        socket.on(updateEvent, handleServerUpdate);

        // 组件挂载时主动请求当前数据（防止切换页签后丢失进度）
        socket.emit('request-expert-data', { expertId });

        return () => {
            socket.off(updateEvent, handleServerUpdate);
        };
    }, [socket, expertId]);

    const updateState = (projectId: string, newData: T) => {
        setState(newData);
        if (socket) {
            socket.emit('update-expert-data', { expertId, projectId, data: newData });
        }
    };

    return { state, updateState, setState };
};
