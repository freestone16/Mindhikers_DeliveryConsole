import { useState } from 'react';
import { X, Settings, Check, AlertCircle, Eye, EyeOff, ChevronDown, ChevronUp, Image, Video } from 'lucide-react';
import { useLLMConfig } from '../hooks/useLLMConfig';
import { PROVIDER_INFO, EXPERT_LIST, IMAGE_MODELS, VIDEO_MODELS, type ExpertConfig } from '../schemas/llm-config';

interface LLMConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'global' | 'generation' | 'experts' | 'apikeys';

export const LLMConfigModal = ({ isOpen, onClose }: LLMConfigModalProps) => {
  const { status, savedKeys, loading, saveApiKey, updateConfig, testConnection } = useLLMConfig();
  const [activeTab, setActiveTab] = useState<TabType>('global');
  const [showApiKey, setShowApiKey] = useState(false);
  const [newApiKey, setNewApiKey] = useState('');
  const [newApiKey2, setNewApiKey2] = useState('');
  const [newProjectId, setNewProjectId] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; latency?: number; error?: string }>>({});
  const [expandedExperts, setExpandedExperts] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const handleTest = async (provider: string) => {
    setTesting(provider);
    setTestResults(prev => ({ ...prev, [provider]: { success: false, error: 'testing...' } }));
    const result = await testConnection(provider);
    setTestResults(prev => ({ ...prev, [provider]: result }));
    setTesting(null);
  };

  const handleSaveKey = async () => {
    if (!selectedProvider || !newApiKey) return;
    
    if (selectedProvider === 'volcengine') {
      await saveApiKey(selectedProvider, newApiKey, newApiKey2, newProjectId);
    } else {
      await saveApiKey(selectedProvider, newApiKey);
    }
    setNewApiKey('');
    setNewApiKey2('');
    setNewProjectId('');
  };

  const handleGlobalChange = async (field: string, value: string) => {
    setSaving(true);
    await updateConfig({ global: { [field]: value } });
    setSaving(false);
  };

  const handleGenerationChange = async (field: string, value: string) => {
    setSaving(true);
    await updateConfig({ generation: { [field]: value } });
    setSaving(false);
  };

  const handleExpertToggle = async (expertId: string, enabled: boolean) => {
    const currentExpert = status?.experts[expertId];
    const newConfig: ExpertConfig = {
      enabled,
      llm: currentExpert?.llm || null,
      imageModel: currentExpert?.imageModel || null,
      videoModel: currentExpert?.videoModel || null,
    };
    setSaving(true);
    await updateConfig({ experts: { [expertId]: newConfig } });
    setSaving(false);
  };

  const handleExpertConfigChange = async (expertId: string, field: string, value: any) => {
    const currentExpert = status?.experts[expertId] || { enabled: false, llm: null, imageModel: null, videoModel: null };
    const newExpert: ExpertConfig = {
      ...currentExpert,
      enabled: currentExpert.enabled,
      [field]: value,
    };
    setSaving(true);
    await updateConfig({ experts: { [expertId]: newExpert } });
    setSaving(false);
  };

  const toggleExpertExpanded = (expertId: string) => {
    setExpandedExperts(prev => {
      const next = new Set(prev);
      if (next.has(expertId)) {
        next.delete(expertId);
      } else {
        next.add(expertId);
      }
      return next;
    });
  };

  if (!isOpen) return null;

  const tabs: { id: TabType; label: string }[] = [
    { id: 'global', label: 'Global' },
    { id: 'generation', label: '生成配置' },
    { id: 'experts', label: '专家配置' },
    { id: 'apikeys', label: 'API Keys' },
  ];

  const llmProviders = Object.entries(PROVIDER_INFO).filter(([_, v]) => v.type === 'llm');

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 rounded-xl w-full max-w-4xl border border-slate-700 shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
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

        {/* Tabs */}
        <div className="flex border-b border-slate-700">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center text-slate-500 py-8">Loading...</div>
          ) : (
            <>
              {/* Global Tab */}
              {activeTab === 'global' && status && (
                <div className="space-y-4">
                  <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                    <h3 className="text-sm font-bold text-slate-400 uppercase mb-3">默认 LLM</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-slate-500">Provider</label>
                        <select
                          className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white mt-1"
                          value={status.global.provider}
                          onChange={(e) => handleGlobalChange('provider', e.target.value)}
                          disabled={saving}
                        >
                          {llmProviders.map(([id, info]) => (
                            <option key={id} value={id}>{info.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-slate-500">Model</label>
                        <select
                          className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white mt-1"
                          value={status.global.model}
                          onChange={(e) => handleGlobalChange('model', e.target.value)}
                          disabled={saving}
                        >
                          {PROVIDER_INFO[status.global.provider]?.models.map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => handleTest(status.global.provider)}
                        disabled={testing === status.global.provider}
                        className="text-xs text-blue-400 hover:text-blue-300 disabled:opacity-50"
                      >
                        {testing === status.global.provider ? 'Testing...' : 'Test Connection'}
                      </button>
                      {testResults[status.global.provider] && (
                        testResults[status.global.provider].success ? (
                          <span className="text-xs text-green-400 flex items-center gap-1">
                            <Check className="w-3 h-3" /> Connected ({testResults[status.global.provider].latency}ms)
                          </span>
                        ) : (
                          <span className="text-xs text-red-400 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> {testResults[status.global.provider].error}
                          </span>
                        )
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Generation Tab */}
              {activeTab === 'generation' && status && (
                <div className="space-y-4">
                  <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                    <h3 className="text-sm font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
                      <Image className="w-4 h-4" /> 默认图生配置
                    </h3>
                    <select
                      className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                      value={status.generation.imageModel}
                      onChange={(e) => handleGenerationChange('imageModel', e.target.value)}
                      disabled={saving}
                    >
                      {IMAGE_MODELS.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                    <h3 className="text-sm font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
                      <Video className="w-4 h-4" /> 默认视频生成配置
                    </h3>
                    <select
                      className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                      value={status.generation.videoModel}
                      onChange={(e) => handleGenerationChange('videoModel', e.target.value)}
                      disabled={saving}
                    >
                      {VIDEO_MODELS.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Experts Tab */}
              {activeTab === 'experts' && status && (
                <div className="space-y-3">
                  {EXPERT_LIST.map(expert => {
                    const expertConfig = status.experts[expert.id];
                    const isEnabled = expertConfig?.enabled ?? false;
                    const isExpanded = expandedExperts.has(expert.id);

                    return (
                      <div key={expert.id} className="bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden">
                        <div 
                          className="p-3 flex items-center justify-between cursor-pointer hover:bg-slate-700/30"
                          onClick={() => toggleExpertExpanded(expert.id)}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-lg">{expert.icon}</span>
                            <div>
                              <div className="text-white font-medium">{expert.name}</div>
                              <div className="text-xs text-slate-500">{expert.description}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isEnabled}
                                onChange={(e) => handleExpertToggle(expert.id, e.target.checked)}
                                className="sr-only peer"
                              />
                              <div className="w-9 h-5 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                          </div>
                        </div>
                        {isExpanded && (
                          <div className="p-3 border-t border-slate-700 bg-slate-800/30 space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-xs text-slate-500">LLM Provider</label>
                                <select
                                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white mt-1"
                                  value={expertConfig?.llm?.provider || ''}
                                  onChange={(e) => handleExpertConfigChange(expert.id, 'llm', { provider: e.target.value, model: null, baseUrl: null })}
                                  disabled={saving}
                                >
                                  <option value="">继承 Global</option>
                                  {llmProviders.map(([id, info]) => (
                                    <option key={id} value={id}>{info.name}</option>
                                  ))}
                                </select>
                              </div>
                              {expertConfig?.llm?.provider && (
                                <div>
                                  <label className="text-xs text-slate-500">Model</label>
                                  <select
                                    className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white mt-1"
                                    value={expertConfig.llm.model || ''}
                                    onChange={(e) => handleExpertConfigChange(expert.id, 'llm', { ...expertConfig.llm, model: e.target.value })}
                                    disabled={saving}
                                  >
                                    {PROVIDER_INFO[expertConfig.llm.provider]?.models.map(m => (
                                      <option key={m} value={m}>{m}</option>
                                    ))}
                                  </select>
                                </div>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-xs text-slate-500 flex items-center gap-1">
                                  <Image className="w-3 h-3" /> 图生模型
                                </label>
                                <select
                                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white mt-1"
                                  value={expertConfig?.imageModel || ''}
                                  onChange={(e) => handleExpertConfigChange(expert.id, 'imageModel', e.target.value)}
                                  disabled={saving}
                                >
                                  <option value="">继承 Global</option>
                                  {IMAGE_MODELS.map(m => (
                                    <option key={m.id} value={m.id}>{m.name}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="text-xs text-slate-500 flex items-center gap-1">
                                  <Video className="w-3 h-3" /> 视频模型
                                </label>
                                <select
                                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white mt-1"
                                  value={expertConfig?.videoModel || ''}
                                  onChange={(e) => handleExpertConfigChange(expert.id, 'videoModel', e.target.value)}
                                  disabled={saving}
                                >
                                  <option value="">继承 Global</option>
                                  {VIDEO_MODELS.map(m => (
                                    <option key={m.id} value={m.id}>{m.name}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* API Keys Tab */}
              {activeTab === 'apikeys' && status && (
                <div className="space-y-3">
                  {Object.entries(PROVIDER_INFO).map(([id, info]) => {
                    const configured = status.providers[id]?.configured;
                    return (
                      <div key={id} className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-medium">{info.name}</span>
                            <span className={`text-xs px-2 py-0.5 rounded ${info.type === 'llm' ? 'bg-blue-500/20 text-blue-300' : 'bg-purple-500/20 text-purple-300'}`}>
                              {info.type === 'llm' ? 'LLM' : '生成'}
                            </span>
                            {configured ? (
                              <span className="text-xs text-green-400 flex items-center gap-1">
                                <Check className="w-3 h-3" /> 已配置 •••• {savedKeys[id]?.last4}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-500">未配置</span>
                            )}
                          </div>
                          <button
                            onClick={() => setSelectedProvider(id)}
                            className={`text-xs px-3 py-1 rounded ${configured ? 'bg-slate-600 text-slate-300 hover:bg-slate-500' : 'bg-blue-600 text-white hover:bg-blue-500'}`}
                          >
                            {configured ? '修改' : '配置'}
                          </button>
                        </div>
                        {selectedProvider === id && (
                          <div className="mt-3 pt-3 border-t border-slate-600">
                            <div className="flex gap-2">
                              <input
                                type={showApiKey ? 'text' : 'password'}
                                className="flex-1 bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white text-sm"
                                placeholder={`Enter ${info.name} API Key...`}
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
                                保存
                              </button>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              <button
                                onClick={() => handleTest(id)}
                                disabled={testing === id || !configured}
                                className="text-xs text-blue-400 hover:text-blue-300 disabled:opacity-50"
                              >
                                {testing === id ? '测试中...' : '测试连接'}
                              </button>
                              {testResults[id] && (
                                testResults[id].success ? (
                                  <span className="text-xs text-green-400 flex items-center gap-1">
                                    <Check className="w-3 h-3" /> 成功 ({testResults[id].latency}ms)
                                  </span>
                                ) : (
                                  <span className="text-xs text-red-400 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" /> {testResults[id].error}
                                  </span>
                                )
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 flex justify-end gap-2">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
};
