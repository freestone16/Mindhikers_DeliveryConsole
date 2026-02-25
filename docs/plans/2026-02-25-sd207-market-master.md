# SD-207: 市场大师 — TubeBuddy SEO 优化器实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 集成 TubeBuddy Keyword Explorer，实现后置 SEO 优化管线：LLM 生成多套标题/标签方案 → TubeBuddy 打分 → 用户选择最优组合

**Architecture:** Playwright 驱动本地 Chrome + TubeBuddy 扩展，通过 SSE 流式返回打分结果。前端采用 3 Phase HITL 架构（Generate → Score → Confirm），复刻 DirectorSection 模式。

**Tech Stack:** Playwright, SSE (Server-Sent Events), React, TailwindCSS, TypeScript

---

## 前置依赖

```bash
# 安装 Playwright
npm install playwright @playwright/test
npx playwright install chromium
```

**环境变量 (.env)**:
```env
TUBEBUDDY_EXTENSION_PATH=/Users/你的用户名/Library/Application Support/Google/Chrome/Default/Extensions/gokgkhicdajjngjnhpjmbhdmogmncabb/4.8.2_0
TUBEBUDDY_PROFILE_DIR=/Users/你的用户名/.tubebuddy-chrome-profile
```

---

## Phase 1: 类型定义 + Mock 数据 + 前端骨架

**目标:** 建立数据结构，Mock 数据跑通 UI

### Task 1.1: 类型定义

**Files:**
- Modify: `src/types.ts`

**Step 1: 在 types.ts 末尾添加 SD-207 类型**

```typescript
// ============================================================
// SD-207: Market Master (TubeBuddy SEO) Types
// ============================================================

export interface TitleTagSet {
    id: string;
    index: number;
    title: string;
    tags: string[];
    source: 'llm' | 'user';
    status: 'pending' | 'scoring' | 'scored';
    tubeBuddyScore?: TubeBuddyScore;
    userComment?: string;
}

export interface TubeBuddyScore {
    overallScore: number;          // 1-100
    weightedScore?: number;        // Pro 账号专属
    metrics: {
        searchVolume: number;      // 搜索量评级 1-100
        competition: number;       // 竞争度 1-100
        optimization: number;      // 优化度 1-100
        relevance: number;         // 相关度 1-100
    };
    rawMetrics?: {
        monthlySearches?: number;
        competitionLevel?: 'low' | 'medium' | 'high';
    };
}

export interface MarketModule_V2 {
    phase: 1 | 2 | 3;
    selectedScript?: {
        filename: string;
        path: string;
    };
    titleTagSets: TitleTagSet[];
    selectedSetId?: string;
    generationConfig?: {
        count: number;
        focusKeywords?: string[];
        language: 'zh' | 'en';
    };
    finalOutput?: {
        title: string;
        tags: string[];
        savedAt: string;
        savedPath: string;
    };
}
```

**Step 2: 验证编译**

Run: `npx tsc --noEmit`
Expected: 无错误

---

### Task 1.2: Mock 数据生成器

**Files:**
- Create: `src/mocks/marketMockData.ts`

**Step 1: 创建 Mock 数据**

```typescript
import type { MarketModule_V2, TitleTagSet, TubeBuddyScore } from '../types';

export const mockTubeBuddyScore = (seed: number): TubeBuddyScore => {
    const rand = (min: number, max: number) => Math.floor((seed * 17 + min) % max);
    return {
        overallScore: rand(60, 95),
        weightedScore: rand(55, 92),
        metrics: {
            searchVolume: rand(40, 90),
            competition: rand(30, 80),
            optimization: rand(50, 95),
            relevance: rand(60, 100)
        },
        rawMetrics: {
            monthlySearches: rand(1000, 500000),
            competitionLevel: seed % 3 === 0 ? 'low' : seed % 3 === 1 ? 'medium' : 'high'
        }
    };
};

export const mockTitleTagSets: TitleTagSet[] = [
    {
        id: 'tt-001',
        index: 0,
        title: 'AI 如何重塑学习：神经科学视角下的认知革命',
        tags: ['AI学习', '神经科学', '认知革命', '学习方法', '人工智能教育'],
        source: 'llm',
        status: 'scored',
        tubeBuddyScore: mockTubeBuddyScore(1)
    },
    {
        id: 'tt-002',
        index: 1,
        title: '为什么你的大脑需要 AI：5 个科学验证的学习升级',
        tags: ['大脑学习', 'AI辅助', '科学方法', '认知升级', '学习效率'],
        source: 'llm',
        status: 'scored',
        tubeBuddyScore: mockTubeBuddyScore(2)
    },
    {
        id: 'tt-003',
        index: 2,
        title: '从神经可塑性到 AI 增强：未来学习者的进化之路',
        tags: ['神经可塑性', 'AI增强', '未来学习', '认知进化', '教育科技'],
        source: 'llm',
        status: 'pending',
        tubeBuddyScore: undefined
    }
];

export const mockMarketModuleV2: MarketModule_V2 = {
    phase: 1,
    titleTagSets: mockTitleTagSets,
    selectedSetId: 'tt-001',
    generationConfig: {
        count: 5,
        focusKeywords: ['AI', '学习', '神经科学'],
        language: 'zh'
    }
};
```

**Step 2: 验证编译**

Run: `npx tsc --noEmit`
Expected: 无错误

---

### Task 1.3: 前端 Phase 容器骨架

**Files:**
- Create: `src/components/market/MarketPhase1.tsx`
- Create: `src/components/market/MarketPhase2.tsx`
- Create: `src/components/market/MarketPhase3.tsx`

**Step 1: 创建 MarketPhase1.tsx (Generate)**

```tsx
import React, { useState } from 'react';
import { Sparkles, FileText, Settings2 } from 'lucide-react';
import type { MarketModule_V2 } from '../../types';

interface MarketPhase1Props {
    data: MarketModule_V2;
    onUpdate: (data: MarketModule_V2) => void;
    onGenerate: () => void;
    isGenerating: boolean;
}

export const MarketPhase1: React.FC<MarketPhase1Props> = ({
    data,
    onUpdate,
    onGenerate,
    isGenerating
}) => {
    const [count, setCount] = useState(data.generationConfig?.count || 5);
    const [focusKeywords, setFocusKeywords] = useState(
        data.generationConfig?.focusKeywords?.join(', ') || ''
    );

    const handleGenerate = () => {
        onUpdate({
            ...data,
            generationConfig: {
                count,
                focusKeywords: focusKeywords.split(',').map(k => k.trim()).filter(Boolean),
                language: 'zh'
            }
        });
        onGenerate();
    };

    return (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
            <div className="flex items-center gap-2 mb-6">
                <Sparkles className="w-5 h-5 text-orange-400" />
                <h3 className="text-lg font-semibold text-white">Phase 1: SEO 方案生成</h3>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm text-slate-400 mb-2">已选脚本</label>
                    <div className="flex items-center gap-2 bg-slate-900 rounded-lg p-3 border border-slate-700">
                        <FileText className="w-4 h-4 text-slate-500" />
                        <span className="text-slate-300">
                            {data.selectedScript?.filename || '未选择脚本'}
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm text-slate-400 mb-2">生成数量</label>
                        <input
                            type="number"
                            min={3}
                            max={10}
                            value={count}
                            onChange={(e) => setCount(parseInt(e.target.value) || 5)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-slate-400 mb-2">聚焦关键词 (逗号分隔)</label>
                        <input
                            type="text"
                            value={focusKeywords}
                            onChange={(e) => setFocusKeywords(e.target.value)}
                            placeholder="AI, 学习, 神经科学"
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                        />
                    </div>
                </div>

                <button
                    onClick={handleGenerate}
                    disabled={isGenerating || !data.selectedScript}
                    className="w-full py-3 bg-orange-600 hover:bg-orange-500 disabled:bg-slate-700 
                               disabled:text-slate-500 rounded-lg font-medium text-white transition-colors
                               flex items-center justify-center gap-2"
                >
                    {isGenerating ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            生成中...
                        </>
                    ) : (
                        <>
                            <Sparkles className="w-4 h-4" />
                            生成 SEO 方案
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};
```

**Step 2: 创建 MarketPhase2.tsx (Score)**

```tsx
import React from 'react';
import { TrendingUp, Target, Zap, Heart, BarChart3 } from 'lucide-react';
import type { TitleTagSet, TubeBuddyScore } from '../../types';

interface MarketPhase2Props {
    titleTagSets: TitleTagSet[];
    selectedSetId?: string;
    onSelect: (id: string) => void;
    onRescore: (id: string) => void;
    isScoring: boolean;
}

const ScoreBar: React.FC<{ label: string; value: number; icon: React.ReactNode }> = ({
    label, value, icon
}) => {
    const getColor = (v: number) => {
        if (v >= 80) return 'bg-green-500';
        if (v >= 60) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    return (
        <div className="flex items-center gap-2">
            <div className="w-6 text-slate-400">{icon}</div>
            <span className="text-xs text-slate-500 w-16">{label}</span>
            <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                    className={`h-full ${getColor(value)} transition-all duration-500`}
                    style={{ width: `${value}%` }}
                />
            </div>
            <span className="text-xs text-slate-300 w-8 text-right">{value}</span>
        </div>
    );
};

const ScoreCard: React.FC<{
    set: TitleTagSet;
    isSelected: boolean;
    onSelect: () => void;
    onRescore: () => void;
    isScoring: boolean;
}> = ({ set, isSelected, onSelect, onRescore, isScoring }) => {
    const score = set.tubeBuddyScore;

    return (
        <div
            onClick={onSelect}
            className={`bg-slate-900 rounded-xl border-2 p-4 cursor-pointer transition-all
                ${isSelected 
                    ? 'border-orange-500 ring-2 ring-orange-500/30' 
                    : 'border-slate-700 hover:border-slate-600'}`}
        >
            <div className="flex justify-between items-start mb-3">
                <span className="text-xs text-slate-500">方案 #{set.index + 1}</span>
                {set.status === 'scoring' && (
                    <span className="text-xs text-orange-400 flex items-center gap-1">
                        <div className="w-3 h-3 border border-orange-400/30 border-t-orange-400 rounded-full animate-spin" />
                        打分中
                    </span>
                )}
            </div>

            <h4 className="text-sm font-medium text-white mb-2 line-clamp-2">
                {set.title}
            </h4>

            <div className="flex flex-wrap gap-1 mb-4">
                {set.tags.slice(0, 4).map((tag, i) => (
                    <span key={i} className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded">
                        #{tag}
                    </span>
                ))}
                {set.tags.length > 4 && (
                    <span className="text-xs text-slate-500">+{set.tags.length - 4}</span>
                )}
            </div>

            {score && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400">综合评分</span>
                        <span className="text-2xl font-bold text-white">{score.overallScore}</span>
                    </div>
                    <ScoreBar label="搜索量" value={score.metrics.searchVolume} icon={<Target className="w-3 h-3" />} />
                    <ScoreBar label="竞争度" value={100 - score.metrics.competition} icon={<Zap className="w-3 h-3" />} />
                    <ScoreBar label="优化度" value={score.metrics.optimization} icon={<TrendingUp className="w-3 h-3" />} />
                    <ScoreBar label="相关度" value={score.metrics.relevance} icon={<Heart className="w-3 h-3" />} />
                </div>
            )}

            {!score && set.status !== 'scoring' && (
                <button
                    onClick={(e) => { e.stopPropagation(); onRescore(); }}
                    disabled={isScoring}
                    className="w-full py-2 mt-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs text-slate-300"
                >
                    获取分数
                </button>
            )}
        </div>
    );
};

export const MarketPhase2: React.FC<MarketPhase2Props> = ({
    titleTagSets,
    selectedSetId,
    onSelect,
    onRescore,
    isScoring
}) => {
    const sortedSets = [...titleTagSets].sort((a, b) => 
        (b.tubeBuddyScore?.overallScore || 0) - (a.tubeBuddyScore?.overallScore || 0)
    );

    return (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-orange-400" />
                    <h3 className="text-lg font-semibold text-white">Phase 2: TubeBuddy 打分</h3>
                </div>
                <span className="text-sm text-slate-400">
                    {titleTagSets.filter(s => s.status === 'scored').length} / {titleTagSets.length} 已打分
                </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortedSets.map(set => (
                    <ScoreCard
                        key={set.id}
                        set={set}
                        isSelected={selectedSetId === set.id}
                        onSelect={() => onSelect(set.id)}
                        onRescore={() => onRescore(set.id)}
                        isScoring={isScoring}
                    />
                ))}
            </div>
        </div>
    );
};
```

**Step 3: 创建 MarketPhase3.tsx (Confirm)**

```tsx
import React, { useState } from 'react';
import { Check, Download, Edit3, Save } from 'lucide-react';
import type { MarketModule_V2, TitleTagSet } from '../../types';

interface MarketPhase3Props {
    data: MarketModule_V2;
    selectedSet?: TitleTagSet;
    onUpdate: (data: MarketModule_V2) => void;
    onConfirm: () => void;
    isConfirming: boolean;
}

export const MarketPhase3: React.FC<MarketPhase3Props> = ({
    data,
    selectedSet,
    onUpdate,
    onConfirm,
    isConfirming
}) => {
    const [editedTitle, setEditedTitle] = useState(selectedSet?.title || '');
    const [editedTags, setEditedTags] = useState(selectedSet?.tags?.join(', ') || '');
    const [isEditing, setIsEditing] = useState(false);

    React.useEffect(() => {
        if (selectedSet) {
            setEditedTitle(selectedSet.title);
            setEditedTags(selectedSet.tags.join(', '));
        }
    }, [selectedSet]);

    if (!selectedSet) {
        return (
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 text-center">
                <p className="text-slate-400">请先在 Phase 2 中选择一个方案</p>
            </div>
        );
    }

    const handleConfirm = () => {
        onUpdate({
            ...data,
            phase: 3,
            finalOutput: {
                title: editedTitle,
                tags: editedTags.split(',').map(t => t.trim()).filter(Boolean),
                savedAt: new Date().toISOString(),
                savedPath: '05_Marketing/seo_final.json'
            }
        });
        onConfirm();
    };

    return (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
            <div className="flex items-center gap-2 mb-6">
                <Check className="w-5 h-5 text-green-400" />
                <h3 className="text-lg font-semibold text-white">Phase 3: 确认输出</h3>
            </div>

            <div className="space-y-4">
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-sm text-slate-400">最终标题</label>
                        <button
                            onClick={() => setIsEditing(!isEditing)}
                            className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1"
                        >
                            <Edit3 className="w-3 h-3" />
                            {isEditing ? '完成编辑' : '编辑'}
                        </button>
                    </div>
                    {isEditing ? (
                        <textarea
                            value={editedTitle}
                            onChange={(e) => setEditedTitle(e.target.value)}
                            className="w-full bg-slate-900 border border-orange-500 rounded-lg p-3 text-white"
                            rows={2}
                        />
                    ) : (
                        <div className="bg-slate-900 rounded-lg p-3 border border-slate-700">
                            <p className="text-white">{editedTitle}</p>
                        </div>
                    )}
                </div>

                <div>
                    <label className="block text-sm text-slate-400 mb-2">最终标签</label>
                    {isEditing ? (
                        <textarea
                            value={editedTags}
                            onChange={(e) => setEditedTags(e.target.value)}
                            className="w-full bg-slate-900 border border-orange-500 rounded-lg p-3 text-white"
                            rows={2}
                            placeholder="标签1, 标签2, 标签3"
                        />
                    ) : (
                        <div className="flex flex-wrap gap-2 bg-slate-900 rounded-lg p-3 border border-slate-700">
                            {editedTags.split(',').filter(Boolean).map((tag, i) => (
                                <span key={i} className="text-xs bg-orange-500/20 text-orange-300 px-2 py-1 rounded">
                                    #{tag.trim()}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {selectedSet.tubeBuddyScore && (
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                        <div className="flex items-center gap-2">
                            <span className="text-green-400 font-medium">TubeBuddy 综合评分</span>
                            <span className="text-2xl font-bold text-green-300">
                                {selectedSet.tubeBuddyScore.overallScore}
                            </span>
                        </div>
                    </div>
                )}

                <button
                    onClick={handleConfirm}
                    disabled={isConfirming || !editedTitle.trim()}
                    className="w-full py-3 bg-green-600 hover:bg-green-500 disabled:bg-slate-700
                               disabled:text-slate-500 rounded-lg font-medium text-white transition-colors
                               flex items-center justify-center gap-2"
                >
                    {isConfirming ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            保存中...
                        </>
                    ) : (
                        <>
                            <Save className="w-4 h-4" />
                            确认并保存到 05_Marketing
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};
```

**Step 4: 验证编译**

Run: `npx tsc --noEmit`
Expected: 无错误

---

### Task 1.4: 重构 MarketingSection 主容器

**Files:**
- Modify: `src/components/MarketingSection.tsx`

**Step 1: 重写 MarketingSection 为 3 Phase 容器**

```tsx
import React, { useState } from 'react';
import { TrendingUp, ChevronRight } from 'lucide-react';
import type { MarketModule_V2, TitleTagSet } from '../types';
import { mockMarketModuleV2 } from '../mocks/marketMockData';
import { MarketPhase1 } from './market/MarketPhase1';
import { MarketPhase2 } from './market/MarketPhase2';
import { MarketPhase3 } from './market/MarketPhase3';

interface MarketingSectionProps {
    data: MarketModule_V2;
    onUpdate: (newData: MarketModule_V2) => void;
}

type Phase = 1 | 2 | 3;

const phaseLabels: Record<Phase, string> = {
    1: '生成',
    2: '打分',
    3: '确认'
};

export const MarketingSection: React.FC<MarketingSectionProps> = ({ data, onUpdate }) => {
    const [phase, setPhase] = useState<Phase>(data.phase || 1);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isScoring, setIsScoring] = useState(false);
    const [isConfirming, setIsConfirming] = useState(false);

    const currentData = data.titleTagSets.length > 0 ? data : mockMarketModuleV2;

    const handleGenerate = async () => {
        setIsGenerating(true);
        // TODO: 实际 API 调用
        await new Promise(r => setTimeout(r, 2000));
        setIsGenerating(false);
        setPhase(2);
    };

    const handleSelect = (id: string) => {
        onUpdate({ ...currentData, selectedSetId: id });
    };

    const handleRescore = async (id: string) => {
        setIsScoring(true);
        // TODO: 实际 API 调用
        await new Promise(r => setTimeout(r, 1500));
        setIsScoring(false);
    };

    const handleConfirm = async () => {
        setIsConfirming(true);
        // TODO: 实际 API 调用
        await new Promise(r => setTimeout(r, 1000));
        setIsConfirming(false);
    };

    const selectedSet = currentData.titleTagSets.find(s => s.id === currentData.selectedSetId);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900/50">
                    <div className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-orange-400" />
                        <h2 className="font-semibold text-white">营销大师 — TubeBuddy SEO 优化器</h2>
                        <span className="bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded text-xs">
                            SD-207
                        </span>
                    </div>
                </div>

                {/* Phase Indicator */}
                <div className="px-4 py-3 bg-slate-900/30 flex items-center gap-2">
                    {([1, 2, 3] as Phase[]).map((p) => (
                        <React.Fragment key={p}>
                            <button
                                onClick={() => setPhase(p)}
                                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors
                                    ${phase === p
                                        ? 'bg-orange-500 text-white'
                                        : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
                            >
                                Phase {p}: {phaseLabels[p]}
                            </button>
                            {p < 3 && <ChevronRight className="w-4 h-4 text-slate-600" />}
                        </React.Fragment>
                    ))}
                </div>
            </div>

            {/* Phase Content */}
            {phase === 1 && (
                <MarketPhase1
                    data={currentData}
                    onUpdate={onUpdate}
                    onGenerate={handleGenerate}
                    isGenerating={isGenerating}
                />
            )}

            {phase === 2 && (
                <MarketPhase2
                    titleTagSets={currentData.titleTagSets}
                    selectedSetId={currentData.selectedSetId}
                    onSelect={handleSelect}
                    onRescore={handleRescore}
                    isScoring={isScoring}
                />
            )}

            {phase === 3 && (
                <MarketPhase3
                    data={currentData}
                    selectedSet={selectedSet}
                    onUpdate={onUpdate}
                    onConfirm={handleConfirm}
                    isConfirming={isConfirming}
                />
            )}
        </div>
    );
};
```

**Step 2: 验证编译 + 启动**

Run: `npm run dev`
Expected: 前端正常启动，访问 http://localhost:5173

---

## ✅ Phase 1 自测清单

1. [ ] `npx tsc --noEmit` 无类型错误
2. [ ] 前端启动正常，无控制台报错
3. [ ] MarketingSection 渲染 3 Phase 导航
4. [ ] Phase 1 显示 Mock 脚本名
5. [ ] 点击"生成 SEO 方案"按钮触发 loading 状态
6. [ ] Phase 2 显示 3 张 Mock 分数卡片
7. [ ] 分数条颜色正确 (绿/黄/红)
8. [ ] 点击卡片切换选中状态
9. [ ] Phase 3 显示选中方案的标题和标签
10. [ ] 编辑按钮可切换编辑模式
11. [ ] Phase 导航可手动切换
12. [ ] 所有图标正常显示 (lucide-react)

---

## Phase 2: 后端 API (market.ts)

**目标:** 实现 SSE 流式生成 + TubeBuddy 打分

### Task 2.1: 创建 market.ts 路由

**Files:**
- Create: `server/market.ts`

```typescript
import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

const router = Router();

export const generateSEO = async (req: Request, res: Response) => {
    const { projectId, scriptPath, count, focusKeywords } = req.body;
    
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // TODO: 实际 LLM 调用
    const mockSets = [];
    for (let i = 0; i < count; i++) {
        const set = {
            id: `tt-${Date.now()}-${i}`,
            index: i,
            title: `AI 学习方案 #${i + 1}: 深度解析神经科学与认知升级`,
            tags: ['AI学习', '神经科学', '认知升级', '方法' + i],
            source: 'llm',
            status: 'pending'
        };
        mockSets.push(set);
        
        res.write(`data: ${JSON.stringify({ type: 'generated', set })}\n\n`);
        await new Promise(r => setTimeout(r, 500));
    }

    res.write(`data: ${JSON.stringify({ type: 'complete', sets: mockSets })}\n\n`);
    res.end();
};

export const scoreKeyword = async (req: Request, res: Response) => {
    const { setId, keyword } = req.body;
    
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // TODO: 实际 TubeBuddy Worker 调用
    res.write(`data: ${JSON.stringify({ type: 'scoring', setId })}\n\n`);
    
    await new Promise(r => setTimeout(r, 2000));
    
    const score = {
        overallScore: Math.floor(Math.random() * 30) + 65,
        weightedScore: Math.floor(Math.random() * 25) + 60,
        metrics: {
            searchVolume: Math.floor(Math.random() * 50) + 40,
            competition: Math.floor(Math.random() * 40) + 30,
            optimization: Math.floor(Math.random() * 30) + 60,
            relevance: Math.floor(Math.random() * 20) + 75
        }
    };

    res.write(`data: ${JSON.stringify({ type: 'scored', setId, score })}\n\n`);
    res.end();
};

export const confirmSEO = async (req: Request, res: Response) => {
    const { projectId, title, tags } = req.body;
    
    // TODO: 保存到 05_Marketing/seo_final.json
    const output = {
        title,
        tags,
        savedAt: new Date().toISOString(),
        savedPath: '05_Marketing/seo_final.json'
    };

    res.json({ success: true, output });
};

router.post('/generate', generateSEO);
router.post('/score', scoreKeyword);
router.post('/confirm', confirmSEO);

export default router;
```

### Task 2.2: 注册路由到 index.ts

**Files:**
- Modify: `server/index.ts`

添加:
```typescript
import marketRouter from './market';
// ...
app.use('/api/market', marketRouter);
```

---

## Phase 3: TubeBuddy Worker (Playwright)

**目标:** 实现自动化 TubeBuddy 打分

### Task 3.1: 创建 TubeBuddy Worker

**Files:**
- Create: `server/workers/tubebuddy-worker.ts`

```typescript
import { chromium, Browser, BrowserContext, Page } from 'playwright';

export interface TubeBuddyScoreResult {
    overallScore: number;
    weightedScore?: number;
    metrics: {
        searchVolume: number;
        competition: number;
        optimization: number;
        relevance: number;
    };
    rawMetrics?: {
        monthlySearches?: number;
        competitionLevel?: 'low' | 'medium' | 'high';
    };
}

export class TubeBuddyWorker {
    private browser: Browser | null = null;
    private context: BrowserContext | null = null;
    private page: Page | null = null;
    private extensionPath: string;
    private profileDir: string;

    constructor() {
        this.extensionPath = process.env.TUBEBUDDY_EXTENSION_PATH || '';
        this.profileDir = process.env.TUBEBUDDY_PROFILE_DIR || '';
    }

    async initialize(): Promise<void> {
        if (!this.extensionPath) {
            throw new Error('TUBEBUDDY_EXTENSION_PATH not configured');
        }

        this.browser = await chromium.launchPersistentContext(this.profileDir, {
            headless: false,
            args: [
                `--disable-extensions-except=${this.extensionPath}`,
                `--load-extension=${this.extensionPath}`
            ]
        });

        this.context = this.browser;
        const pages = this.context.pages();
        this.page = pages[0] || await this.context.newPage();
        
        console.log('TubeBuddy Worker initialized');
    }

    async scoreKeyword(keyword: string): Promise<TubeBuddyScoreResult> {
        if (!this.page) {
            await this.initialize();
        }

        // Navigate to YouTube with TubeBuddy loaded
        await this.page!.goto('https://www.youtube.com');
        await this.page!.waitForLoadState('networkidle');

        // TODO: 实际 TubeBuddy UI 交互
        // 1. 点击 TubeBuddy 图标
        // 2. 打开 Keyword Explorer
        // 3. 输入 keyword
        // 4. 抓取分数

        console.log(`Scoring keyword: ${keyword}`);

        // Mock result for now
        return {
            overallScore: Math.floor(Math.random() * 30) + 65,
            weightedScore: Math.floor(Math.random() * 25) + 60,
            metrics: {
                searchVolume: Math.floor(Math.random() * 50) + 40,
                competition: Math.floor(Math.random() * 40) + 30,
                optimization: Math.floor(Math.random() * 30) + 60,
                relevance: Math.floor(Math.random() * 20) + 75
            }
        };
    }

    async close(): Promise<void> {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            this.context = null;
            this.page = null;
        }
    }
}

// Singleton instance
let workerInstance: TubeBuddyWorker | null = null;

export async function getTubeBuddyWorker(): Promise<TubeBuddyWorker> {
    if (!workerInstance) {
        workerInstance = new TubeBuddyWorker();
        await workerInstance.initialize();
    }
    return workerInstance;
}

export async function closeTubeBuddyWorker(): Promise<void> {
    if (workerInstance) {
        await workerInstance.close();
        workerInstance = null;
    }
}
```

---

## Phase 4: 前端 API 集成

**目标:** 将前端 Mock 替换为真实 API

### Task 4.1: 更新 MarketingSection 调用真实 API

在 `MarketingSection.tsx` 中替换 Mock 调用为真实 SSE 请求。

---

## Phase 5: 集成测试 + 文档

### Task 5.1: 更新 dev_logs

**Files:**
- Create: `docs/dev_logs/2026-02-25_SD207_Implementation.md`

### Task 5.2: 更新 dev_progress.md

---

## 🧪 12 步自测清单 (最终验收)

| # | 测试项 | 预期结果 | 状态 |
|---|--------|----------|------|
| 1 | TypeScript 编译 | `npx tsc --noEmit` 无错误 | ⬜ |
| 2 | 前端启动 | `npm run dev` 无报错 | ⬜ |
| 3 | MarketingSection 渲染 | 3 Phase 导航正常显示 | ⬜ |
| 4 | Phase 1 Generate | 点击生成触发 SSE 流 | ⬜ |
| 5 | SSE 流式接收 | 控制台显示逐条生成日志 | ⬜ |
| 6 | Phase 2 Score Cards | 分数卡片按分数排序 | ⬜ |
| 7 | 分数动画 | 进度条动画流畅 | ⬜ |
| 8 | 卡片选中 | 橙色边框 + ring 效果 | ⬜ |
| 9 | Phase 3 编辑 | 可修改标题和标签 | ⬜ |
| 10 | 后端 API | `/api/market/*` 响应正常 | ⬜ |
| 11 | TubeBuddy Worker | Playwright 启动 Chrome | ⬜ |
| 12 | 端到端流程 | Generate → Score → Confirm 完整 | ⬜ |

---

## 执行选项

**Plan complete and saved to `docs/plans/2026-02-25-sd207-market-master.md`.**

**两种执行方式:**

1. **Subagent-Driven (当前会话)** - 逐任务派发子代理，任务间审查，快速迭代
2. **Parallel Session (独立会话)** - 打开新窗口批量执行，带检查点

**选择哪种方式?**
