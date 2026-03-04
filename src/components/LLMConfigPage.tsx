import { useState } from 'react';
import { Settings, Check, AlertCircle, Eye, EyeOff, ChevronDown, ChevronUp, Image, Video, ArrowLeft } from 'lucide-react';
import { useLLMConfig } from '../hooks/useLLMConfig';
import { PROVIDER_INFO, EXPERT_LIST, IMAGE_MODELS, VIDEO_MODELS, type ExpertConfig } from '../schemas/llm-config';

interface LLMConfigPageProps {
  onClose?: () => void;
}

type TabType = 'global' | 'generation' | 'experts' | 'apikeys';

export const LLMConfigPage = ({ onClose }: LLMConfigPageProps) => {
  const { status, savedKeys, loading, saveApiKey, updateConfig, testConnection, testAllConnections } = useLLMConfig();
  const [activeTab, setActiveTab] = useState<TabType>('global');
  const [showApiKey, setShowApiKey] = useState(false);
  const [newApiKey, setNewApiKey] = useState('');
  const [newApiKey2, setNewApiKey2] = useState('');
  const [newProjectId, setNewProjectId] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [testingAll, setTestingAll] = useState(false);
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

  const handleTestAll = async () => {
    setTestingAll(true);
    const newResults: Record<string, any> = {};
    Object.keys(PROVIDER_INFO).forEach(id => {
      if (status?.providers[id]?.configured || savedKeys[id]?.configured) {
        newResults[id] = { success: false, error: 'testing...' };
      }
    });
    setTestResults(prev => ({ ...prev, ...newResults }));

    const results = await testAllConnections();
    setTestResults(prev => ({ ...prev, ...results }));
    setTestingAll(false);
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

  const tabs: { id: TabType; label: string }[] = [
    { id: 'global', label: 'Global' },
    { id: 'generation', label: '生成配置' },
    { id: 'experts', label: '专家配置' },
    { id: 'apikeys', label: 'API Keys' },
  ];

  const llmProviders = Object.entries(PROVIDER_INFO).filter(([_, v]) => v.type === 'llm');

  // Sort providers by latency
  const sortedProviders = Object.entries(PROVIDER_INFO).sort(([idA], [idB]) => {
    const resA = testResults[idA];
    const resB = testResults[idB];
    if (resA?.success && resB?.success) return (resA.latency || 0) - (resB.latency || 0);
    if (resA?.success) return -1;
    if (resB?.success) return 1;
    return 0;
  });

  return (
    <div className="min-h-screen bg-[#060b14] flex flex-col font-sans">
      <div className="flex-1 w-full max-w-7xl mx-auto p-4 lg:p-8 flex flex-col">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {onClose && (
              <button onClick={onClose} className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <Settings className="w-6 h-6 text-blue-500" />
                全局模型网关配置
              </h1>
              <p className="text-sm text-slate-400 mt-1">管理 Delivery Console 所有环节的大语言模型与生成大模型状态。</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 flex-1 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col min-h-[70vh]">
          {/* Tabs */}
          <div className="flex border-b border-slate-700 bg-slate-800/30">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-4 text-sm font-medium transition-colors ${activeTab === tab.id
                    ? 'text-blue-400 border-b-2 border-blue-400 bg-slate-800/80'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 bg-slate-900/50">
            {loading ? (
              <div className="flex items-center justify-center h-full text-slate-500">
                <span className="w-6 h-6 border-2 border-slate-600 border-t-slate-400 rounded-full animate-spin mr-3"></span> Loading configuration...
              </div>
            ) : (
              <div className="max-w-4xl mx-auto">
                {/* Global Tab */}
                {activeTab === 'global' && status && (
                  <div className="space-y-4">
                    <div className="bg-slate-800/60 rounded-xl p-6 border border-slate-700 shadow-sm">
                      <h3 className="text-base font-bold text-white mb-4">默认 LLM (Fallback)</h3>
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <label className="text-sm font-medium text-slate-400 block mb-2">Provider</label>
                          <select
                            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
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
                          <label className="text-sm font-medium text-slate-400 block mb-2">Model</label>
                          <select
                            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
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
                      <div className="mt-6 flex items-center gap-3 bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                        <button
                          onClick={() => handleTest(status.global.provider)}
                          disabled={testing === status.global.provider}
                          className="text-sm px-4 py-1.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 rounded-md font-medium transition-colors disabled:opacity-50"
                        >
                          {testing === status.global.provider ? 'Testing...' : 'Test Default Connection'}
                        </button>
                        {testResults[status.global.provider] && (
                          testResults[status.global.provider].success ? (
                            <span className="text-sm text-green-400 flex items-center gap-1.5 font-mono bg-green-400/10 px-3 py-1.5 rounded-md">
                              <Check className="w-4 h-4" /> Connected ({testResults[status.global.provider].latency}ms)
                            </span>
                          ) : (
                            <span className="text-sm text-red-400 flex items-center gap-1.5 bg-red-400/10 px-3 py-1.5 rounded-md">
                              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {testResults[status.global.provider].error}
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Generation Tab */}
                {activeTab === 'generation' && status && (
                  <div className="space-y-6">
                    <div className="bg-slate-800/60 rounded-xl p-6 border border-slate-700 shadow-sm">
                      <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2 border-b border-slate-700 pb-3">
                        <Image className="w-5 h-5 text-purple-400" /> 默认图生配置
                      </h3>
                      <select
                        className="w-full max-w-md bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                        value={status.generation.imageModel}
                        onChange={(e) => handleGenerationChange('imageModel', e.target.value)}
                        disabled={saving}
                      >
                        {IMAGE_MODELS.map(m => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="bg-slate-800/60 rounded-xl p-6 border border-slate-700 shadow-sm">
                      <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2 border-b border-slate-700 pb-3">
                        <Video className="w-5 h-5 text-indigo-400" /> 默认视频生成配置
                      </h3>
                      <select
                        className="w-full max-w-md bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
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
                  <div className="space-y-4">
                    {EXPERT_LIST.map(expert => {
                      const expertConfig = status.experts[expert.id];
                      const isEnabled = expertConfig?.enabled ?? false;
                      const isExpanded = expandedExperts.has(expert.id);

                      return (
                        <div key={expert.id} className="bg-slate-800/60 rounded-xl border border-slate-700 overflow-hidden shadow-sm transition-all">
                          <div
                            className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-700/50 transition-colors"
                            onClick={() => toggleExpertExpanded(expert.id)}
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-slate-900 rounded-lg flex items-center justify-center text-2xl shadow-inner border border-slate-800">
                                {expert.icon}
                              </div>
                              <div>
                                <div className="text-white font-bold text-lg leading-tight">{expert.name}</div>
                                <div className="text-sm text-slate-400 mt-0.5">{expert.description}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-6">
                              <label className="relative inline-flex items-center cursor-pointer" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={isEnabled}
                                  onChange={(e) => handleExpertToggle(expert.id, e.target.checked)}
                                  className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                              </label>
                              <div className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-900/50">
                                {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                              </div>
                            </div>
                          </div>
                          {isExpanded && (
                            <div className="p-5 border-t border-slate-700 bg-slate-900/50 space-y-5">
                              <div className="grid grid-cols-2 gap-6">
                                <div>
                                  <label className="text-sm font-medium text-slate-400 block mb-2">LLM Provider Override</label>
                                  <select
                                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:border-blue-500 transition-colors"
                                    value={expertConfig?.llm?.provider || ''}
                                    onChange={(e) => handleExpertConfigChange(expert.id, 'llm', { provider: e.target.value, model: null, baseUrl: null })}
                                    disabled={saving}
                                  >
                                    <option value="">(Inherit Global)</option>
                                    {llmProviders.map(([id, info]) => (
                                      <option key={id} value={id}>{info.name}</option>
                                    ))}
                                  </select>
                                </div>
                                {expertConfig?.llm?.provider && (
                                  <div>
                                    <label className="text-sm font-medium text-slate-400 block mb-2">Model Override</label>
                                    <select
                                      className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:border-blue-500 transition-colors"
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
                              <div className="grid grid-cols-2 gap-6">
                                <div>
                                  <label className="text-sm font-medium text-slate-400 flex items-center gap-1.5 mb-2">
                                    <Image className="w-4 h-4 text-purple-400" /> Image Gen Model Override
                                  </label>
                                  <select
                                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:border-blue-500 transition-colors"
                                    value={expertConfig?.imageModel || ''}
                                    onChange={(e) => handleExpertConfigChange(expert.id, 'imageModel', e.target.value)}
                                    disabled={saving}
                                  >
                                    <option value="">(Inherit Global)</option>
                                    {IMAGE_MODELS.map(m => (
                                      <option key={m.id} value={m.id}>{m.name}</option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-slate-400 flex items-center gap-1.5 mb-2">
                                    <Video className="w-4 h-4 text-indigo-400" /> Video Gen Model Override
                                  </label>
                                  <select
                                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:border-blue-500 transition-colors"
                                    value={expertConfig?.videoModel || ''}
                                    onChange={(e) => handleExpertConfigChange(expert.id, 'videoModel', e.target.value)}
                                    disabled={saving}
                                  >
                                    <option value="">(Inherit Global)</option>
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
                  <div className="space-y-6">
                    <div className="flex justify-between items-center bg-slate-800/80 p-5 rounded-xl border border-blue-900/30">
                      <div>
                        <h3 className="text-lg font-bold text-white">模型服务健康度监控</h3>
                        <p className="text-sm text-slate-400 mt-1">验证所有已配置供应商的连通性与延迟</p>
                      </div>
                      <button
                        onClick={handleTestAll}
                        disabled={testingAll}
                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-400 disabled:opacity-80 text-white rounded-lg font-medium flex items-center gap-2 transition-colors shadow-lg shadow-blue-900/20"
                      >
                        {testingAll ? (
                          <><span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span> 测通中...</>
                        ) : (
                          <>🔍 一键测通全部</>
                        )}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      {sortedProviders.map(([id, info]) => {
                        const configured = status.providers[id]?.configured;
                        const defaultModel = typeof PROVIDER_INFO[id]?.models[0] === 'string' ? PROVIDER_INFO[id].models[0] : '';
                        const stateColor = testing === id || testingAll
                          ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500' // 🟡
                          : testResults[id]?.success
                            ? 'bg-green-500/10 border-green-500/30 text-green-400'  // 🟢
                            : testResults[id] !== undefined
                              ? 'bg-red-500/10 border-red-500/30 text-red-400'        // 🔴
                              : configured
                                ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'     // 🔵 Configured but not tested
                                : 'bg-slate-800/50 border-slate-700 text-slate-500';    // ⚪ Not configured

                        return (
                          <div key={id} className={`rounded-xl p-5 border transition-all ${stateColor} ${selectedProvider === id ? 'ring-2 ring-blue-500/50 border-blue-500' : ''}`}>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-1">
                                  <span className={`font-bold text-lg ${configured ? 'text-white' : 'text-slate-400'}`}>{info.name}</span>
                                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full uppercase tracking-wider ${info.type === 'llm' ? 'bg-blue-500/20 text-blue-300' : 'bg-purple-500/20 text-purple-300'}`}>
                                    {info.type === 'llm' ? 'LLM' : '生成'}
                                  </span>
                                </div>
                                <div className="text-sm font-mono text-slate-400 flex items-center gap-2">
                                  <span className="truncate max-w-[200px]" title={info.baseUrl}>{info.baseUrl.replace('https://', '')}</span>
                                  <span className="text-slate-600">|</span>
                                  <span className="text-slate-300 truncate max-w-[150px]" title={defaultModel}>{defaultModel}</span>
                                </div>
                                <div className="mt-3 flex items-center gap-3">
                                  {configured ? (
                                    <div className="flex items-center gap-2 text-sm bg-slate-900/50 px-2 py-1 rounded border border-slate-700">
                                      <Check className="w-3.5 h-3.5 text-green-500" />
                                      <span className="text-slate-300 font-mono tracking-widest text-xs">•••• {savedKeys[id]?.last4 || '****'}</span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2 text-sm text-slate-500 px-2 py-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span> 未配置 API Key
                                    </div>
                                  )}

                                  {/* Test Status Info */}
                                  {(testing === id || (testingAll && configured)) ? (
                                    <span className="text-xs text-yellow-500 flex items-center gap-1.5 bg-yellow-500/10 px-2 py-1 rounded">
                                      <span className="w-3 h-3 border border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin"></span> 测通中...
                                    </span>
                                  ) : testResults[id] ? (
                                    testResults[id].success ? (
                                      <span className="text-xs text-green-400 flex items-center gap-1.5 font-mono bg-green-400/10 px-2 py-1 rounded">
                                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                        {testResults[id].latency}ms
                                      </span>
                                    ) : (
                                      <span className="text-xs text-red-400 flex items-center gap-1.5 bg-red-400/10 px-2 py-1 rounded max-w-[200px] truncate" title={testResults[id].error}>
                                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {testResults[id].error}
                                      </span>
                                    )
                                  ) : null}
                                </div>
                              </div>
                              <div className="flex gap-2">
                                {configured && (
                                  <button
                                    onClick={() => handleTest(id)}
                                    disabled={testing === id || testingAll}
                                    className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors disabled:opacity-50"
                                    title="测试单个连接"
                                  >
                                    <Settings className="w-4 h-4" />
                                  </button>
                                )}
                                <button
                                  onClick={() => setSelectedProvider(selectedProvider === id ? null : id)}
                                  className={`text-xs px-4 py-2 font-medium rounded-lg transition-colors ${configured
                                      ? selectedProvider === id ? 'bg-slate-700 text-white shadow-inner' : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                                      : 'bg-blue-600 text-white hover:bg-blue-500 shadow-md shadow-blue-900/20'
                                    }`}
                                >
                                  {configured ? '管理 Key' : '立即配置'}
                                </button>
                              </div>
                            </div>

                            {/* Key Editing Area */}
                            {selectedProvider === id && (
                              <div className="mt-4 pt-4 border-t border-slate-700/50 animate-in fade-in slide-in-from-top-2 duration-200">
                                <label className="text-xs font-medium text-slate-400 block mb-2">{info.envVars[0]} (Local ENV override)</label>
                                <div className="flex gap-3">
                                  <div className="relative flex-1">
                                    <input
                                      type={showApiKey ? 'text' : 'password'}
                                      className="w-full bg-slate-900/80 border border-slate-600 rounded-lg pl-4 pr-10 py-2.5 text-white font-mono text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                      placeholder={configured ? '输入新的 API Key 覆盖旧配置...' : `输入 ${info.name} API Key...`}
                                      value={newApiKey}
                                      onChange={(e) => setNewApiKey(e.target.value)}
                                    />
                                    <button
                                      onClick={() => setShowApiKey(!showApiKey)}
                                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                                    >
                                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                  </div>
                                  <button
                                    onClick={handleSaveKey}
                                    disabled={!newApiKey}
                                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-lg font-medium transition-colors whitespace-nowrap"
                                  >
                                    保存 Key
                                  </button>
                                </div>
                                {info.type === 'generation' && id === 'volcengine' && (
                                  <div className="mt-3 bg-blue-500/10 border border-blue-500/20 p-3 rounded-lg flex items-start gap-2 text-sm text-blue-300">
                                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                    <p>火山引擎除 Access Key 外，部分端点可能还需要 Secret Key 和 Endpoint ID，当前暂不支持在界面完整管理这些复杂凭据，建议直接在 .env 配置。</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
