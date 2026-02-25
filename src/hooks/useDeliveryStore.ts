import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import type { DeliveryState, SelectedScript } from '../types';

const SOCKET_URL = 'http://127.0.0.1:3002';
const API_URL = 'http://localhost:3002';

const INITIAL_STATE: DeliveryState = {
    projectId: '',
    modules: {
        director: { phase: 1, conceptProposal: '', conceptFeedback: '', isConceptApproved: false, items: [] },
        music: { phase: 1, moodProposal: '', conceptFeedback: '', isConceptApproved: false, items: [] },
        thumbnail: { variants: [] },
        marketing: {
            strategy: {
                seo: { titleCandidates: [], description: '', keywords: [], competitorAnalysis: '' },
                social: { twitterThread: '', redditPost: '' },
                geo: { locationTags: [], culturalRelevance: '' }
            },
            feedback: '',
            isSubmitted: false
        },
        shorts: { items: [], uploadHistory: [] }
    }
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
            const normalizedData = {
                ...data,
                modules: {
                    ...INITIAL_STATE.modules,
                    ...data.modules,
                    shorts: data.modules.shorts || { items: [], uploadHistory: [] }
                }
            };
            setState(normalizedData);
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

    const selectScript = async (scriptPath: string): Promise<boolean> => {
        try {
            const res = await fetch(`${API_URL}/api/scripts/select`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: scriptPath })
            });
            return res.ok;
        } catch (err) {
            console.error('Select script error:', err);
            return false;
        }
    };

    return { state, isConnected, updateState, selectScript, socket };
};
