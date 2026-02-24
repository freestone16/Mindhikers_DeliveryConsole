import { useState, useEffect } from 'react';
import type { LLMConfig } from '../schemas/llm-config';

interface ConfigStatus {
  providers: Record<string, { configured: boolean; model: string }>;
  global: LLMConfig['global'];
  experts: Record<string, { provider: string | null; model: string | null; inherited: boolean }>;
}

export const useLLMConfig = () => {
  const [status, setStatus] = useState<ConfigStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await fetch('http://localhost:3002/api/llm-config/status');
      const data = await res.json();
      setStatus(data);
    } catch (err) {
      console.error('Failed to fetch LLM config status:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveApiKey = async (provider: string, apiKey: string) => {
    const res = await fetch('http://localhost:3002/api/llm-config/api-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, apiKey }),
    });
    const data = await res.json();
    if (data.success) fetchStatus();
    return data;
  };

  const updateConfig = async (updates: { global?: Partial<LLMConfig['global']>; experts?: Record<string, any> }) => {
    const res = await fetch('http://localhost:3002/api/llm-config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (data.success) fetchStatus();
    return data;
  };

  const testConnection = async (provider: string) => {
    const res = await fetch('http://localhost:3002/api/llm-config/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider }),
    });
    return res.json();
  };

  return { status, loading, saveApiKey, updateConfig, testConnection, refresh: fetchStatus };
};
