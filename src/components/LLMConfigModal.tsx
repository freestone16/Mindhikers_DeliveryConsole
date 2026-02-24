import { useState } from 'react';
import { X, Settings, Check, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useLLMConfig } from '../hooks/useLLMConfig';

interface LLMConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PROVIDERS = [
  { id: 'openai', name: 'OpenAI', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'] },
  { id: 'anthropic', name: 'Anthropic', models: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229'] },
  { id: 'google', name: 'Google', models: ['gemini-1.5-pro', 'gemini-1.5-flash'] },
  { id: 'deepseek', name: 'DeepSeek', models: ['deepseek-chat', 'deepseek-coder'] },
  { id: 'zhipu', name: 'Zhipu AI', models: ['glm-4', 'glm-4-flash'] },
];

export const LLMConfigModal = ({ isOpen, onClose }: LLMConfigModalProps) => {
  const { status, loading, saveApiKey, updateConfig, testConnection } = useLLMConfig();
  const [showApiKey, setShowApiKey] = useState(false);
  const [newApiKey, setNewApiKey] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('openapi');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; latency?: number; error?: string } | null>(null);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    const result = await testConnection(selectedProvider);
    setTestResult(result);
    setTesting(false);
  };

  const handleSaveKey = async () => {
    if (!newApiKey) return;
    await saveApiKey(selectedProvider, newApiKey);
    setNewApiKey('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 rounded-xl w-full max-w-2xl border border-slate-700 shadow-2xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Settings className="w-5 h-5" />
            LLM Configuration
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {loading ? (
            <div className="text-center text-slate-500 py-8">Loading...</div>
          ) : (
            <>
              {/* Global Settings */}
              <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                <h3 className="text-sm font-bold text-slate-400 uppercase mb-3">Global Settings</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-500">Provider</label>
                    <select 
                      className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white mt-1"
                      value={status?.global.provider || 'openai'}
                      onChange={(e) => updateConfig({ global: { provider: e.target.value as any } })}
                    >
                      {PROVIDERS.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Model</label>
                    <select 
                      className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white mt-1"
                      value={status?.global.model || 'gpt-4o'}
                      onChange={(e) => updateConfig({ global: { model: e.target.value } })}
                    >
                      {PROVIDERS.find(p => p.id === status?.global.provider)?.models.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* API Key Management */}
              <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                <h3 className="text-sm font-bold text-slate-400 uppercase mb-3">API Keys</h3>
                <div className="space-y-2">
                  {PROVIDERS.map(p => {
                    const configured = status?.providers[p.id]?.configured;
                    return (
                      <div key={p.id} className="flex items-center justify-between py-2 border-b border-slate-700/50 last:border-0">
                        <div className="flex items-center gap-2">
                          <span className="text-white">{p.name}</span>
                          {configured ? (
                            <span className="text-xs text-green-400 flex items-center gap-1">
                              <Check className="w-3 h-3" /> Configured
                            </span>
                          ) : (
                            <span className="text-xs text-slate-500">Not set</span>
                          )}
                        </div>
                        <button 
                          className="text-xs text-blue-400 hover:text-blue-300"
                          onClick={() => setSelectedProvider(p.id)}
                        >
                          {configured ? 'Change' : 'Configure'}
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Configure Key Section */}
                {selectedProvider && (
                  <div className="mt-4 p-3 bg-slate-800 rounded border border-slate-600">
                    <div className="text-sm text-white mb-2">Configure {PROVIDERS.find(p => p.id === selectedProvider)?.name}</div>
                    <div className="flex gap-2">
                      <input
                        type={showApiKey ? 'text' : 'password'}
                        className="flex-1 bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white text-sm"
                        placeholder="Enter API Key..."
                        value={newApiKey}
                        onChange={(e) => setNewApiKey(e.target.value)}
                      />
                      <button
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="p-2 text-slate-400 hover:text-white"
                      >
                        {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={handleSaveKey}
                        disabled={!newApiKey}
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded text-sm"
                      >
                        Save
                      </button>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={handleTest}
                        disabled={testing || !newApiKey}
                        className="text-xs text-blue-400 hover:text-blue-300 disabled:opacity-50"
                      >
                        {testing ? 'Testing...' : 'Test Connection'}
                      </button>
                      {testResult && (
                        testResult.success ? (
                          <span className="text-xs text-green-400 flex items-center gap-1">
                            <Check className="w-3 h-3" /> Connected ({testResult.latency}ms)
                          </span>
                        ) : (
                          <span className="text-xs text-red-400 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> {testResult.error}
                          </span>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Expert Overrides */}
              <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                <h3 className="text-sm font-bold text-slate-400 uppercase mb-3">Expert-Specific Override</h3>
                <div className="text-sm text-slate-500">
                  Expert-level configuration will be available in a future update.
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 flex justify-end gap-2">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-slate-400 hover:text-white"
          >
            Cancel
          </button>
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
