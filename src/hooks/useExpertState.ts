import { useEffect, useState, useCallback, useRef } from 'react';

export const useExpertState = <T>(expertId: string, initialState: T, projectId?: string) => {
    const [state, setState] = useState<T>(initialState);
    const [socket, setSocket] = useState<any>(null);
    const hydratedRef = useRef(false);

    useEffect(() => {
        const checkSocket = setInterval(() => {
            const globalSocket = (window as any).socket;
            if (globalSocket) {
                setSocket(globalSocket);
                clearInterval(checkSocket);
            }
        }, 100);
        return () => clearInterval(checkSocket);
    }, []);

    const applyUpdate = useCallback((newData: any) => {
        const actualData = newData.data !== undefined ? newData.data : newData;
        setState(actualData);
        hydratedRef.current = true;
    }, []);

    // 🔑 确定性状态恢复：projectId 变化时通过 HTTP GET 拿持久化状态
    useEffect(() => {
        if (!projectId) return;

        hydratedRef.current = false; // 项目切换时重置
        fetch(`/api/expert-state/${expertId}?projectId=${encodeURIComponent(projectId)}`)
            .then(res => res.json())
            .then(result => {
                if (result.success && result.data) {
                    const data = result.data;
                    // 只有后端有实质数据时才覆盖（防止空 state 文件覆盖 initialState）
                    const hasSubstance = data.phase > 1 || data.isConceptApproved || (data.items && data.items.length > 0);
                    if (hasSubstance) {
                        console.log(`[useExpertState][${expertId}] 🔑 HTTP hydration: phase=${data.phase}, items=${data.items?.length || 0}`);
                        setState(data);
                    } else {
                        console.log(`[useExpertState][${expertId}] 🔑 HTTP hydration: backend state is empty, using initialState`);
                    }
                    hydratedRef.current = true;
                }
            })
            .catch(err => {
                console.warn(`[useExpertState][${expertId}] HTTP hydration failed:`, err);
                hydratedRef.current = true; // 失败也算完成，允许后续写操作
            });
    }, [expertId, projectId]);

    useEffect(() => {
        if (!socket) return;

        const updateEvent = `expert-data-update:${expertId}`;
        socket.on(updateEvent, applyUpdate);

        const handleActionResult = (result: any) => {
            if (result.expertId === expertId && result.success && result.expertState) {
                console.log(`[useExpertState][${expertId}] 🎯 chat-action-result carrying fresh state`);
                applyUpdate(result.expertState);
            }
        };
        socket.on('chat-action-result', handleActionResult);

        if (!hydratedRef.current) {
            socket.emit('request-expert-hydration', { expertId });
        }

        return () => {
            socket.off(updateEvent, applyUpdate);
            socket.off('chat-action-result', handleActionResult);
        };
    }, [socket, expertId, applyUpdate]);

    const updateState = useCallback((pid: string, newData: T) => {
        if (!hydratedRef.current) {
            console.warn(`[useExpertState][${expertId}] ⚠️ Blocked write-back before hydration`);
            return;
        }
        setState(newData);
        const globalSocket = (window as any).socket;
        if (globalSocket) {
            globalSocket.emit('update-expert-data', { expertId, projectId: pid, data: newData });
        }
    }, [expertId]);

    return { state, updateState, setState };
};
