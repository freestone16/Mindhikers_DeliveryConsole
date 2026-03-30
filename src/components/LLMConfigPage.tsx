import { useState } from 'react';
import { Settings, Check, AlertCircle, Eye, EyeOff, ChevronDown, ChevronUp, Image, Video, ArrowLeft, Shield } from 'lucide-react';
import { useLLMConfig } from '../hooks/useLLMConfig';
import { PROVIDER_INFO, EXPERT_LIST, type ExpertConfig, type GenProvider, type GenerationConfig } from '../schemas/llm-config';

interface LLMConfigPageProps {
  onClose?: () => void;
}

type TabType = 'llm' | 'visual' | 'experts';

export const LLMConfigPage = ({ onClose }: LLMConfigPageProps) => {
  const { status, savedKeys, loading, saveApiKey, updateConfig, testConnection, testAllConnections } = useLLMConfig();
  const [activeTab, setActiveTab] = useState<TabType>('llm');
  const [showApiKey, setShowApiKey] = useState(false);
  const [newApiKey, setNewApiKey] = useState('');
  const [selectedLLMProvider, setSelectedLLMProvider] = useState<string | null>(null);
  const [selectedGenerationProvider, setSelectedGenerationProvider] = useState<string | null>(null);
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

  const handleSaveKey = async (provider: string | null) => {
    if (!provider || !newApiKey) return;
    await saveApiKey(provider, newApiKey);
    setNewApiKey('');
  };

  const handleGlobalChange = async (field: string, value: string) => {
    setSaving(true);
    await updateConfig({ global: { [field]: value } });
    setSaving(false);
  };

  const handleGenerationTargetChange = async (
    taskType: keyof GenerationConfig,
    patch: Partial<GenerationConfig[keyof GenerationConfig]>,
  ) => {
    setSaving(true);
    await updateConfig({ generation: { [taskType]: patch } as Partial<GenerationConfig> });
    setSaving(false);
  };

  const handleExpertToggle = async (expertId: string, enabled: boolean) => {
    // Toggle controls both enable/disable AND expand/collapse
    setExpandedExperts(prev => {
      const next = new Set(prev);
      if (enabled) next.add(expertId);
      else next.delete(expertId);
      return next;
    });
    const currentExpert = status?.experts[expertId];
    const newConfig: ExpertConfig = {
      enabled,
      llm: currentExpert?.llm || null,
    };
    setSaving(true);
    await updateConfig({ experts: { [expertId]: newConfig } });
    setSaving(false);
  };

  const handleExpertConfigChange = async (expertId: string, field: string, value: any) => {
    const currentExpert = status?.experts[expertId] || { enabled: false, llm: null };
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
    const expertConfig = status?.experts[expertId];
    if (!expertConfig?.enabled) return; // disabled = cannot expand
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
    { id: 'llm', label: 'LLM配置' },
    { id: 'visual', label: '视觉模型配置' },
    { id: 'experts', label: '专家模块配置' },
  ];

  const llmProviders = Object.entries(PROVIDER_INFO).filter(([_, v]) => v.type === 'llm');
  const generationProviders = Object.entries(PROVIDER_INFO).filter(([_, v]) => v.type === 'generation');

  const pickLLMProvider = (provider: string | null) => {
    setSelectedLLMProvider(provider);
    setNewApiKey('');
  };

  const pickGenerationProvider = (provider: string | null) => {
    setSelectedGenerationProvider(provider);
    setNewApiKey('');
  };

  const getVisualProviders = (taskType: keyof GenerationConfig): GenProvider[] => {
    if (!status) return [];
    return (Object.keys(status.availableModels[taskType]) as GenProvider[])
      .filter((provider) => status.availableModels[taskType][provider]?.length > 0);
  };

  const getVisualModels = (taskType: keyof GenerationConfig, provider: GenProvider) => {
    if (!status) return [];
    return status.availableModels[taskType][provider] || [];
  };

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
                {/* LLM配置 Tab */}
                {activeTab === 'llm' && status && (
                  <div className="space-y-6">
                    {/* BYOK 安全免责 */}
                    <div className="flex items-start gap-3 bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
                      <Shield className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-amber-200/80">
                        <span className="font-semibold text-amber-300">BYOK (Bring Your Own Key)</span> — 所有 API Key 仅存储在本地 <code className="text-xs bg-slate-800 px-1.5 py-0.5 rounded font-mono text-slate-300">.env</code> 文件中，不会上传至任何第三方服务器。本工具不对 API Key 的泄露或滥用承担责任，请妥善保管您的密钥。
                      </p>
                    </div>

                    {/* 核心凭证区 — 配置新 Key */}
                    <div className="bg-slate-800/60 rounded-xl p-5 border border-slate-700 shadow-sm space-y-4">
                      <h3 className="text-base font-bold text-white">核心凭证区 <span className="text-slate-500 font-normal text-sm ml-1">Credentials</span></h3>

                      {/* Provider 选择 */}
                      <div>
                        <label className="text-xs font-medium text-slate-400 block mb-1.5">选择 LLM 服务商</label>
                        <select
                          className="w-full max-w-sm bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                          value={selectedLLMProvider || ''}
                          onChange={(e) => pickLLMProvider(e.target.value || null)}
                        >
                          <option value="">— 选择服务商 —</option>
                          {llmProviders.map(([id, info]) => (
                            <option key={id} value={id}>{info.name}{status.providers[id]?.configured ? ' (已配置)' : ''}</option>
                          ))}
                        </select>
                      </div>

                      {/* 选中后展示输入表单 */}
                      {selectedLLMProvider && PROVIDER_INFO[selectedLLMProvider]?.type === 'llm' && (() => {
                        const info = PROVIDER_INFO[selectedLLMProvider];
                        const configured = status.providers[selectedLLMProvider]?.configured;
                        const last4 = savedKeys[selectedLLMProvider]?.last4;
                        return (
                          <div className="space-y-4 pt-2 border-t border-slate-700/50">
                            {/* API Key（必填） */}
                            <div>
                              <label className="text-xs font-medium text-slate-400 block mb-1.5">API Key <span className="text-red-400">*</span></label>
                              <div className="relative">
                                <input
                                  type={showApiKey ? 'text' : 'password'}
                                  className="w-full bg-slate-900 border border-slate-600 rounded-lg pl-4 pr-10 py-2.5 text-white font-mono text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors placeholder-slate-600"
                                  placeholder={configured ? `已配置（•••• ${last4 || '****'}）— 输入新 Key 可覆盖` : `输入 ${info.name} API Key...`}
                                  value={newApiKey}
                                  onChange={(e) => setNewApiKey(e.target.value)}
                                />
                                <button
                                  onClick={() => setShowApiKey(!showApiKey)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                                >
                                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                              </div>
                            </div>

                            {/* Base URL（选填） */}
                            <div>
                              <label className="text-xs font-medium text-slate-500 block mb-1.5">Base URL <span className="text-slate-600 font-normal">（选填，留空使用默认值）</span></label>
                              <input
                                type="text"
                                className="w-full bg-slate-900/50 border border-slate-700/60 rounded-lg px-4 py-2 text-slate-300 font-mono text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors placeholder-slate-600"
                                placeholder={info.baseUrl}
                                readOnly
                              />
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-3 pt-1">
                              <button
                                onClick={() => handleSaveKey(selectedLLMProvider)}
                                disabled={!newApiKey}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-lg font-medium text-sm transition-colors"
                              >
                                保存 Key
                              </button>
                              <button
                                onClick={() => handleTest(selectedLLMProvider)}
                                disabled={testing === selectedLLMProvider || testingAll || !configured}
                                className="px-4 py-2 text-blue-400 hover:bg-blue-500/10 rounded-lg border border-slate-700 transition-colors disabled:opacity-40 text-sm"
                              >
                                {testing === selectedLLMProvider ? '测试中...' : '测试连接'}
                              </button>
                              {/* Inline test result */}
                              {testResults[selectedLLMProvider]?.success ? (
                                <span className="text-xs text-green-400 font-mono bg-green-400/10 px-2 py-1 rounded">{testResults[selectedLLMProvider].latency}ms</span>
                              ) : testResults[selectedLLMProvider] && testResults[selectedLLMProvider].error !== 'testing...' ? (
                                <span className="text-xs text-red-400 bg-red-400/10 px-2 py-1 rounded flex items-center gap-1 truncate max-w-[250px]" title={testResults[selectedLLMProvider].error}>
                                  <AlertCircle className="w-3 h-3 flex-shrink-0" /> {testResults[selectedLLMProvider].error}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* 已配置服务状态 — 紧凑单行 */}
                    {llmProviders.some(([id]) => status.providers[id]?.configured) && (
                      <div className="bg-slate-800/40 rounded-xl border border-slate-700/50 overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700/50">
                          <h4 className="text-sm font-semibold text-slate-300">已配置服务</h4>
                          <button
                            onClick={handleTestAll}
                            disabled={testingAll}
                            className="px-3 py-1 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 rounded-md font-medium text-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
                          >
                            {testingAll ? (<><span className="w-3 h-3 border-2 border-blue-400/20 border-t-blue-400 rounded-full animate-spin"></span> 测通中...</>) : '一键测通'}
                          </button>
                        </div>
                        <div className="divide-y divide-slate-700/30">
                          {llmProviders.filter(([id]) => status.providers[id]?.configured).map(([id, info]) => (
                            <div key={id} className="flex items-center gap-4 px-5 py-3 hover:bg-slate-800/30 transition-colors">
                              <span className="font-medium text-white text-sm min-w-[90px]">{info.name}</span>
                              <span className="text-xs font-mono text-slate-500 truncate max-w-[180px]">{info.baseUrl.replace('https://', '')}</span>
                              <div className="flex items-center gap-2 text-xs bg-slate-900/50 px-2 py-0.5 rounded border border-slate-700/50">
                                <Check className="w-3 h-3 text-green-500" />
                                <span className="text-slate-400 font-mono tracking-widest">•••• {savedKeys[id]?.last4 || '****'}</span>
                              </div>
                              <div className="flex-1"></div>
                              {/* Test status */}
                              {(testing === id || (testingAll)) ? (
                                <span className="text-xs text-yellow-400 flex items-center gap-1">
                                  <span className="w-3 h-3 border border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin"></span>
                                </span>
                              ) : testResults[id]?.success ? (
                                <span className="text-xs text-green-400 font-mono">{testResults[id].latency}ms</span>
                              ) : testResults[id] ? (
                                <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                              ) : null}
                              <button
                                onClick={() => handleTest(id)}
                                disabled={testing === id || testingAll}
                                className="text-xs px-2.5 py-1 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded border border-slate-700/50 transition-colors disabled:opacity-40"
                              >
                                测试
                              </button>
                              <button
                                onClick={() => pickLLMProvider(id)}
                                className="text-xs px-2.5 py-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded border border-slate-700/50 transition-colors"
                              >
                                修改
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 默认 LLM (Fallback) — 原 Global 内容 */}
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

                {/* 视觉模型配置 Tab */}
                {activeTab === 'visual' && status && (
                  <div className="space-y-6">
                    <div className="flex items-start gap-3 bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
                      <Shield className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-amber-200/80">
                        <span className="font-semibold text-amber-300">BYOK</span> — API Key 仅存储在本地 <code className="text-xs bg-slate-800 px-1.5 py-0.5 rounded font-mono text-slate-300">.env</code> 文件中，不会上传至第三方服务器。
                      </p>
                    </div>

                    <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-5">
                      <h3 className="text-base font-bold text-white">默认视觉路由是唯一真相源</h3>
                      <p className="text-sm text-slate-300 mt-2">
                        Director 的图生缩略图、Phase3 底图生成、信息图底图和视频生成统一读取下面这两组默认配置。
                        专家模块页不再允许单独覆盖视觉模型，避免默认配置和业务执行脱节。
                      </p>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                      {([
                        {
                          key: 'image',
                          title: '默认文生图路由',
                          description: 'Phase2 缩略图、Remotion 底图、信息图底图统一读取这里。',
                          icon: <Image className="w-5 h-5 text-purple-400" />,
                        },
                        {
                          key: 'video',
                          title: '默认文生视频路由',
                          description: 'Phase3 云端文生视频统一读取这里。',
                          icon: <Video className="w-5 h-5 text-indigo-400" />,
                        },
                      ] as const).map((section) => {
                        const current = status.generation[section.key];
                        const providers = getVisualProviders(section.key);
                        const models = getVisualModels(section.key, current.provider);

                        return (
                          <div key={section.key} className="bg-slate-800/60 rounded-xl p-6 border border-slate-700 shadow-sm space-y-4">
                            <div className="border-b border-slate-700 pb-3">
                              <h3 className="text-base font-bold text-white flex items-center gap-2">
                                {section.icon}
                                {section.title}
                              </h3>
                              <p className="text-sm text-slate-400 mt-2">{section.description}</p>
                            </div>

                            <div>
                              <label className="text-xs font-medium text-slate-400 block mb-2">服务商</label>
                              <select
                                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                                value={current.provider}
                                onChange={(e) => handleGenerationTargetChange(section.key, { provider: e.target.value as GenProvider })}
                                disabled={saving}
                              >
                                {providers.map((provider) => (
                                  <option key={provider} value={provider}>
                                    {PROVIDER_INFO[provider].name}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="text-xs font-medium text-slate-400 block mb-2">模型</label>
                              <select
                                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                                value={current.model}
                                onChange={(e) => handleGenerationTargetChange(section.key, { model: e.target.value })}
                                disabled={saving}
                              >
                                {models.map((model) => (
                                  <option key={model.id} value={model.id}>{model.name}</option>
                                ))}
                              </select>
                            </div>

                            <div className="rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-3 text-xs text-slate-400">
                              当前生效：<span className="text-white font-medium">{PROVIDER_INFO[current.provider].name}</span>
                              <span className="text-slate-500 mx-1">/</span>
                              <span className="font-mono text-slate-300">{current.model}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-base font-bold text-white">视觉服务凭证 <span className="text-slate-500 font-normal text-sm ml-1">Credentials</span></h3>
                      <div className="bg-slate-800/60 rounded-xl p-5 border border-slate-700 shadow-sm space-y-4">
                        <div>
                          <label className="text-xs font-medium text-slate-400 block mb-1.5">选择视觉服务商</label>
                          <select
                            className="w-full max-w-sm bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                            value={selectedGenerationProvider || ''}
                            onChange={(e) => pickGenerationProvider(e.target.value || null)}
                          >
                            <option value="">— 选择视觉服务商 —</option>
                            {generationProviders.map(([id, info]) => (
                              <option key={id} value={id}>{info.name}{savedKeys[id]?.configured ? ' (已配置)' : ''}</option>
                            ))}
                          </select>
                        </div>

                        {selectedGenerationProvider && PROVIDER_INFO[selectedGenerationProvider]?.type === 'generation' && (
                          <div className="space-y-4 pt-2 border-t border-slate-700/50">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <span className="font-bold text-white">{PROVIDER_INFO[selectedGenerationProvider].name}</span>
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 uppercase">视觉</span>
                                {savedKeys[selectedGenerationProvider]?.configured && (
                                  <span className="text-xs bg-green-500/10 text-green-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <Check className="w-3 h-3" /> 已配置
                                  </span>
                                )}
                              </div>
                              {(testing === selectedGenerationProvider || (testingAll && savedKeys[selectedGenerationProvider]?.configured)) ? (
                                <span className="text-xs text-yellow-400 flex items-center gap-1.5 bg-yellow-400/10 px-2 py-1 rounded">
                                  <span className="w-3 h-3 border border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin"></span> 测通中...
                                </span>
                              ) : testResults[selectedGenerationProvider]?.success ? (
                                <span className="text-xs text-green-400 font-mono bg-green-400/10 px-2 py-1 rounded">{testResults[selectedGenerationProvider].latency}ms</span>
                              ) : testResults[selectedGenerationProvider] && testResults[selectedGenerationProvider].error !== 'testing...' ? (
                                <span className="text-xs text-red-400 bg-red-400/10 px-2 py-1 rounded flex items-center gap-1" title={testResults[selectedGenerationProvider].error}>
                                  <AlertCircle className="w-3 h-3" /> {testResults[selectedGenerationProvider].error}
                                </span>
                              ) : null}
                            </div>

                            <div>
                              <label className="text-xs font-medium text-slate-400 block mb-1.5">
                                API Key <span className="text-red-400">*</span>
                                <span className="text-slate-600 ml-1">{PROVIDER_INFO[selectedGenerationProvider].envVars[0]}</span>
                              </label>
                              <div className="relative">
                                <input
                                  type={showApiKey ? 'text' : 'password'}
                                  className="w-full bg-slate-900 border border-slate-600 rounded-lg pl-4 pr-10 py-2.5 text-white font-mono text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors placeholder-slate-600"
                                  placeholder={savedKeys[selectedGenerationProvider]?.configured ? `已配置（•••• ${savedKeys[selectedGenerationProvider]?.last4 || '****'}）— 输入新 Key 可覆盖` : `输入 ${PROVIDER_INFO[selectedGenerationProvider].name} 凭证...`}
                                  value={newApiKey}
                                  onChange={(e) => setNewApiKey(e.target.value)}
                                />
                                <button
                                  onClick={() => setShowApiKey(!showApiKey)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                                >
                                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                              </div>
                            </div>

                            <div>
                              <label className="text-xs font-medium text-slate-500 block mb-1.5">Base URL</label>
                              <input
                                type="text"
                                className="w-full bg-slate-900/50 border border-slate-700/60 rounded-lg px-4 py-2 text-slate-300 font-mono text-xs"
                                value={PROVIDER_INFO[selectedGenerationProvider].baseUrl}
                                readOnly
                              />
                            </div>

                            <div className="flex items-center gap-3 pt-1">
                              <button
                                onClick={() => handleSaveKey(selectedGenerationProvider)}
                                disabled={!newApiKey}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-lg font-medium text-sm transition-colors"
                              >
                                保存凭证
                              </button>
                              <button
                                onClick={() => handleTest(selectedGenerationProvider)}
                                disabled={testing === selectedGenerationProvider || testingAll || !savedKeys[selectedGenerationProvider]?.configured}
                                className="px-4 py-2 text-blue-400 hover:bg-blue-500/10 rounded-lg border border-slate-700 transition-colors disabled:opacity-40 text-sm"
                              >
                                {testing === selectedGenerationProvider ? '测试中...' : '测试连接'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {generationProviders.some(([id]) => savedKeys[id]?.configured) && (
                      <div className="bg-slate-800/40 rounded-xl border border-slate-700/50 overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700/50">
                          <h4 className="text-sm font-semibold text-slate-300">已配置视觉服务</h4>
                          <button
                            onClick={handleTestAll}
                            disabled={testingAll}
                            className="px-3 py-1 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 rounded-md font-medium text-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
                          >
                            {testingAll ? (<><span className="w-3 h-3 border-2 border-blue-400/20 border-t-blue-400 rounded-full animate-spin"></span> 测通中...</>) : '一键测通'}
                          </button>
                        </div>
                        <div className="divide-y divide-slate-700/30">
                          {generationProviders.filter(([id]) => savedKeys[id]?.configured).map(([id, info]) => (
                            <div key={id} className="flex items-center gap-4 px-5 py-3 hover:bg-slate-800/30 transition-colors">
                              <span className="font-medium text-white text-sm min-w-[120px]">{info.name}</span>
                              <span className="text-xs font-mono text-slate-500 truncate max-w-[220px]">{info.baseUrl.replace('https://', '')}</span>
                              <div className="flex items-center gap-2 text-xs bg-slate-900/50 px-2 py-0.5 rounded border border-slate-700/50">
                                <Check className="w-3 h-3 text-green-500" />
                                <span className="text-slate-400 font-mono tracking-widest">•••• {savedKeys[id]?.last4 || '****'}</span>
                              </div>
                              <div className="flex-1"></div>
                              {(testing === id || testingAll) ? (
                                <span className="text-xs text-yellow-400 flex items-center gap-1">
                                  <span className="w-3 h-3 border border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin"></span>
                                </span>
                              ) : testResults[id]?.success ? (
                                <span className="text-xs text-green-400 font-mono">{testResults[id].latency}ms</span>
                              ) : testResults[id] ? (
                                <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                              ) : null}
                              <button
                                onClick={() => handleTest(id)}
                                disabled={testing === id || testingAll}
                                className="text-xs px-2.5 py-1 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded border border-slate-700/50 transition-colors disabled:opacity-40"
                              >
                                测试
                              </button>
                              <button
                                onClick={() => pickGenerationProvider(id)}
                                className="text-xs px-2.5 py-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded border border-slate-700/50 transition-colors"
                              >
                                修改
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
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
                        <div key={expert.id} className={`rounded-xl border overflow-hidden shadow-sm transition-all ${isEnabled ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-800/30 border-slate-800 opacity-60'}`}>
                          <div className="p-4 flex items-center justify-between">
                            <div className={`flex items-center gap-4 ${isEnabled ? '' : 'opacity-60'}`}>
                              <div className="w-12 h-12 bg-slate-900 rounded-lg flex items-center justify-center text-2xl shadow-inner border border-slate-800">
                                {expert.icon}
                              </div>
                              <div>
                                <div className="text-white font-bold text-lg leading-tight">{expert.name}</div>
                                <div className="text-sm text-slate-400 mt-0.5">{expert.description}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-6">
                              {/* Toggle = enable + expand/collapse */}
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={isEnabled}
                                  onChange={(e) => handleExpertToggle(expert.id, e.target.checked)}
                                  className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                              </label>
                              {isEnabled && (
                              <div className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-900/50 cursor-pointer" onClick={() => toggleExpertExpanded(expert.id)}>
                                {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                              </div>
                              )}
                            </div>
                          </div>
                          {isExpanded && isEnabled && (
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
                              <div className="rounded-lg border border-slate-700/60 bg-slate-800/40 px-4 py-3 text-sm text-slate-400">
                                视觉模型已统一收口到“视觉模型配置”页的默认路由。专家模块这里仅保留 LLM override，避免一套系统出现多份视觉真相源。
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* API Keys tab removed — credentials merged into LLM配置 and 视觉模型配置 tabs */}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
