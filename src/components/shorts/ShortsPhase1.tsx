import { useState, useEffect } from 'react';
import { Rocket, Loader2, FileText, Sparkles } from 'lucide-react';
import type { ShortScript, CTA } from '../../types';
import { buildApiUrl } from '../../config/runtime';

interface ShortsPhase1Props {
    projectId: string;
    onGenerated: (scripts: ShortScript[]) => void;
}

interface ScriptFile {
    name: string;
    path: string;
}

interface RowConfig {
    cta: CTA;
    style: string;
}

const CTA_OPTIONS: { value: CTA; label: string }[] = [
    { value: 'follow', label: '关注' },
    { value: 'share', label: '分享' },
    { value: 'comment', label: '评论' },
    { value: 'link', label: '链接' },
    { value: 'subscribe', label: '订阅' },
];

const STYLE_OPTIONS = [
    { value: 'suspense', label: '悬疑' },
    { value: 'knowledge', label: '知识' },
    { value: 'emotion', label: '情绪' },
    { value: 'contrast', label: '对比' },
    { value: 'narrative', label: '叙事' },
];

export const ShortsPhase1 = ({ projectId, onGenerated }: ShortsPhase1Props) => {
    const [scripts, setScripts] = useState<ScriptFile[]>([]);
    const [selectedScript, setSelectedScript] = useState<string>('');
    const [scriptContent, setScriptContent] = useState<string>('');
    const [count, setCount] = useState(6);
    const [rowConfigs, setRowConfigs] = useState<RowConfig[]>([]);
    const [userComment, setUserComment] = useState('');
    const [isLoadingScripts, setIsLoadingScripts] = useState(true);
    const [isRecommending, setIsRecommending] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedScripts, setGeneratedScripts] = useState<ShortScript[]>([]);

    useEffect(() => {
        loadScripts();
    }, [projectId]);

    const loadScripts = async () => {
        setIsLoadingScripts(true);
        try {
            const res = await fetch(buildApiUrl(`/api/scripts?projectId=${projectId}`));
            const data = await res.json();
            setScripts(data.scripts || []);
        } catch (e) {
            console.error('Load scripts error:', e);
        } finally {
            setIsLoadingScripts(false);
        }
    };

    const handleScriptSelect = async (path: string) => {
        setSelectedScript(path);
        if (!path) {
            setScriptContent('');
            setRowConfigs([]);
            return;
        }

        try {
            const res = await fetch(buildApiUrl('/api/scripts/content'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId, path })
            });
            const data = await res.json();
            setScriptContent(data.content || '');
            
            fetchRecommendation(data.content, count);
        } catch (e) {
            console.error('Load script content error:', e);
        }
    };

    const fetchRecommendation = async (content: string, targetCount: number) => {
        if (!content.trim()) return;
        
        setIsRecommending(true);
        try {
            const res = await fetch(buildApiUrl('/api/shorts/phase1/recommend'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId, content, count: targetCount })
            });
            
            const data = await res.json();
            if (data.recommendations) {
                setRowConfigs(data.recommendations.map((r: any) => ({
                    cta: r.cta as CTA,
                    style: r.style
                })));
            }
        } catch (e) {
            console.error('Recommendation error:', e);
            setRowConfigs(Array.from({ length: targetCount }, (_, i) => ({
                cta: CTA_OPTIONS[i % CTA_OPTIONS.length].value,
                style: STYLE_OPTIONS[i % STYLE_OPTIONS.length].value
            })));
        } finally {
            setIsRecommending(false);
        }
    };

    useEffect(() => {
        if (scriptContent && count > 0) {
            fetchRecommendation(scriptContent, count);
        }
    }, [count]);

    const handleRowConfigChange = (index: number, field: 'cta' | 'style', value: string) => {
        setRowConfigs(prev => {
            const newConfigs = [...prev];
            if (!newConfigs[index]) {
                newConfigs[index] = { cta: 'follow', style: 'knowledge' };
            }
            newConfigs[index] = { ...newConfigs[index], [field]: value };
            return newConfigs;
        });
    };

    const handleGenerate = async () => {
        if (!scriptContent.trim()) {
            alert('请先选择长文案');
            return;
        }

        setIsGenerating(true);
        setGeneratedScripts([]);

        try {
            const response = await fetch(buildApiUrl('/api/shorts/phase1/generate'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId,
                    count,
                    ctaDistribution: rowConfigs.slice(0, count).map(r => r.cta),
                    styleDistribution: rowConfigs.slice(0, count).map(r => r.style),
                    topic: scriptContent,
                    userComment
                })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Server error');
            }

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            const allScripts: ShortScript[] = [];

            if (reader) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value, { stream: true });
                    const lines = chunk.split('\n');

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            try {
                                const dataStr = line.replace('data: ', '');
                                const jsonData = JSON.parse(dataStr);

                                if (jsonData.type === 'script') {
                                    allScripts.push(jsonData.script);
                                    setGeneratedScripts([...allScripts]);
                                } else if (jsonData.type === 'done') {
                                    onGenerated(jsonData.scripts || allScripts);
                                } else if (jsonData.type === 'error') {
                                    throw new Error(jsonData.message);
                                }
                            } catch (e) {
                                // Ignore partial JSON
                            }
                        }
                    }
                }
            }
        } catch (e: any) {
            console.error(e);
            alert('生成失败: ' + e.message);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-slate-900/50 rounded-lg p-6 border border-slate-700">
                <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-cyan-400" />
                    脚本工厂
                </h3>
                
                <div className="space-y-5">
                    <div>
                        <label className="block text-sm text-slate-400 mb-2">📄 长文案来源</label>
                        <div className="flex gap-3">
                            <select
                                value={selectedScript}
                                onChange={(e) => handleScriptSelect(e.target.value)}
                                disabled={isLoadingScripts}
                                className="flex-1 bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white"
                            >
                                <option value="">选择文档...</option>
                                {scripts.map(s => (
                                    <option key={s.path} value={s.path}>{s.name}</option>
                                ))}
                            </select>
                            {isRecommending && (
                                <div className="flex items-center gap-2 text-sm text-yellow-400">
                                    <Sparkles className="w-4 h-4 animate-pulse" />
                                    智能推荐中...
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="w-32">
                            <label className="block text-sm text-slate-400 mb-2">生成数量</label>
                            <input
                                type="number"
                                min={1}
                                max={20}
                                value={count}
                                onChange={(e) => setCount(Math.min(20, Math.max(1, parseInt(e.target.value) || 1)))}
                                className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white"
                            />
                        </div>
                    </div>

                    {rowConfigs.length > 0 && (
                        <div>
                            <label className="block text-sm text-slate-400 mb-2">
                                📊 CTA 与风格配置 {isRecommending && <span className="text-yellow-400">(智能推荐中...)</span>}
                            </label>
                            <div className="bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden">
                                <table className="w-full">
                                    <thead className="bg-slate-900/50">
                                        <tr>
                                            <th className="w-12 px-3 py-2 text-left text-xs font-medium text-slate-400">#</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-slate-400">CTA 策略</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-slate-400">风格偏好</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-700">
                                        {Array.from({ length: count }).map((_, i) => (
                                            <tr key={i} className="hover:bg-slate-800/30">
                                                <td className="px-3 py-2 text-sm text-slate-300">{i + 1}</td>
                                                <td className="px-3 py-2">
                                                    <select
                                                        value={rowConfigs[i]?.cta || 'follow'}
                                                        onChange={(e) => handleRowConfigChange(i, 'cta', e.target.value)}
                                                        className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-white"
                                                    >
                                                        {CTA_OPTIONS.map(opt => (
                                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="px-3 py-2">
                                                    <select
                                                        value={rowConfigs[i]?.style || 'knowledge'}
                                                        onChange={(e) => handleRowConfigChange(i, 'style', e.target.value)}
                                                        className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-white"
                                                    >
                                                        {STYLE_OPTIONS.map(opt => (
                                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm text-slate-400 mb-2">💬 补充说明（可选）</label>
                        <textarea
                            value={userComment}
                            onChange={(e) => setUserComment(e.target.value)}
                            placeholder="例如：前3条偏科普向，后3条偏情绪共鸣；或者描述你想要的特定风格..."
                            rows={2}
                            className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white resize-none text-sm"
                        />
                    </div>

                    <div className="flex justify-end">
                        <button
                            onClick={handleGenerate}
                            disabled={isGenerating || !scriptContent.trim()}
                            className="flex items-center gap-2 px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    生成中...
                                </>
                            ) : (
                                <>
                                    <Rocket className="w-4 h-4" />
                                    生成脚本
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {generatedScripts.length > 0 && (
                <div className="bg-slate-900/30 rounded-lg p-4 border border-slate-700">
                    <h4 className="text-sm font-medium text-slate-300 mb-3">生成进度 ({generatedScripts.length}/{count})</h4>
                    <div className="space-y-2">
                        {generatedScripts.map((script, i) => (
                            <div key={script.id || i} className="bg-slate-800/50 rounded p-3 text-sm">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-cyan-400 font-medium">#{script.index || i + 1}</span>
                                    <span className="text-xs bg-slate-700 px-1.5 py-0.5 rounded">{script.cta}</span>
                                    <span className="text-xs text-slate-500">{script.hookType}</span>
                                </div>
                                <p className="text-slate-300 line-clamp-2">{script.scriptText}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
