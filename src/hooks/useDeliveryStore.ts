import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import type { DeliveryState } from '../types';
import { buildApiUrl, runtimeConfig } from '../config/runtime';

const SOCKET_URL = runtimeConfig.socketUrl;

export const INITIAL_STATE: DeliveryState = {
    projectId: '',
    lastUpdated: new Date().toISOString(),
};

export const useDeliveryStore = () => {
    const [state, setState] = useState<DeliveryState>(INITIAL_STATE);
    const [isConnected, setIsConnected] = useState(false);
    const [socket, setSocket] = useState<any>(null);

    useEffect(() => {
        const newSocket = io(SOCKET_URL);
        setSocket(newSocket);

        newSocket.on('connect', () => {
            console.log('Connected to local backend');
            setIsConnected(true);
        });

        newSocket.on('disconnect', () => {
            console.log('Disconnected');
            setIsConnected(false);
        });

        newSocket.on('delivery-data', (data: DeliveryState) => {
            console.log('Received data update', data);
            setState(data);
        });

        newSocket.on('render-progress', (progress: any) => {
            console.log('Render progress:', progress);
        });

        newSocket.on('render-started', (result: any) => {
            console.log('Render started:', result);
        });

        (window as any).socket = newSocket;

        return () => {
            newSocket.close();
        };
    }, []);

    const updateState = (newData: DeliveryState) => {
        setState(newData);
        if (socket) {
            socket.emit('update-data', newData);
        }
    };

    const selectScript = async (projectId: string, scriptPath: string): Promise<boolean> => {
        try {
            const res = await fetch(buildApiUrl('/api/scripts/select'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId, path: scriptPath })
            });
            return res.ok;
        } catch (err) {
            console.error('Select script error:', err);
            return false;
        }
    };

    return { state, isConnected, updateState, selectScript, socket, setState };
};
