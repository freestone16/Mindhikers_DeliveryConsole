import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import type { VisualPlan } from '../types';
import { API_BASE, SOCKET_URL } from '../config';

export const useVisualPlan = () => {
    const [plan, setPlan] = useState<VisualPlan | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const socket = io(SOCKET_URL);

        socket.on('connect', () => {
            console.log('VisualAudit: Connected to socket');
        });

        socket.on('visual-plan-update', (data: VisualPlan | null) => {
            console.log('VisualAudit: Received plan update', data);
            setPlan(data);
            setLoading(false);
        });

        socket.on('visual-plan-error', (err: string) => {
            setError(err);
            setLoading(false);
        });

        return () => {
            socket.close();
        };
    }, []);

    const updateSceneStatus = async (sceneId: string, status: 'approved' | 'rejected', comment?: string) => {
        try {
            const res = await fetch(`${API_BASE}/api/visual-plan/scene/review`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sceneId, status, comment })
            });

            if (!res.ok) throw new Error('Failed to update scene');

            // Optimistic update
            if (plan) {
                const updatedScenes = plan.scenes.map(s =>
                    s.id === sceneId ? { ...s, status, review_comment: comment || null } : s
                );
                setPlan({ ...plan, scenes: updatedScenes });
            }
        } catch (err: any) {
            console.error('Update scene error:', err);
            setError(err.message);
        }
    };

    return { plan, loading, error, updateSceneStatus };
};
