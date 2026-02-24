import { useState, useEffect } from 'react';
import type { LLMConfig, ExpertConfig } from '../schemas/llm-config';

interface ConfigStatus {
  providers: Record<string, { 
    configured: boolean; 
    type: string;
    name: string;
    models: string[];
  }>;
  global: LLMConfig['global'];
  generation: LLMConfig['generation'];
  experts: Record<string, ExpertConfig | null>;
  availableModels: {
    image: { id: string; name: string }[];
    video: { id: string; name: string }[];
  };
}

interface SavedKeys {
  [provider: string]: { last4: string; configured: boolean };
}

export const useLLMConfig = () => {
  const [status, setStatus] = useState<ConfigStatus | null>(null);
  const [savedKeys, setSavedKeys] = useState<SavedKeys>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatus();
    fetchSavedKeys();
  }, []);

  const fetchSavedKeys = async () => {
    try {
      const res = await fetch('http://localhost:3002/api/llm-config/keys');
      const data = await res.json();
      setSavedKeys(data);
    } catch (err) {
      console.error('Failed to fetch saved keys:', err);
    }
  };

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

  const saveApiKey = async (provider: string, apiKey: string, apiKey2?: string, projectId?: string) => {
    const res = await fetch('http://localhost:3002/api/llm-config/api-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, apiKey, apiKey2, projectId }),
    });
    const data = await res.json();
    if (data.success) {
      fetchStatus();
      fetchSavedKeys();
    }
    return data;
  };

  const updateConfig = async (updates: { 
    global?: Partial<LLMConfig['global']>; 
    generation?: Partial<LLMConfig['generation']>;
    experts?: Record<string, ExpertConfig | null>;
  }) => {
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

  return { status, savedKeys, loading, saveApiKey, updateConfig, testConnection, refresh: fetchStatus };
};
