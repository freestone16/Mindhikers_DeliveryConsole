import { PenTool, MessageSquare, ArrowRight } from 'lucide-react';

export const CrucibleHome = () => {
    return (
        <main className="max-w-4xl mx-auto px-6 py-12 text-slate-200">
            <div className="mb-12 text-center">
                <h2 className="text-3xl font-bold mb-4 text-amber-500 flex items-center justify-center gap-3">
                    <span>🔥</span> 黄金坩埚 (Golden Crucible)
                </h2>
                <p className="text-slate-400 max-w-2xl mx-auto">
                    Ideas are forged here through dialectic reasoning and deep exploration before they enter the delivery pipeline.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {/* Socratic Dialogue Placeholder */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 relative overflow-hidden group">
                    <div className="absolute top-4 right-4 bg-slate-700/50 text-slate-300 text-xs px-2 py-1 rounded">
                        即将推出
                    </div>
                    <div className="flex items-start gap-5 relative z-10">
                        <div className="p-4 bg-amber-500/10 text-amber-400 rounded-xl">
                            <MessageSquare className="w-8 h-8" />
                        </div>
                        <div className="pt-1">
                            <h3 className="text-xl font-semibold mb-2 text-slate-100">苏格拉底对话 (Socratic Dialogue)</h3>
                            <p className="text-slate-400 leading-relaxed mb-4">
                                多智能体辩论架构：由"老张"（批判性反方）与"老卢"（结构化导师）组成的正反合思维模型。通过深度提问与批判性探讨，将模糊想法提炼为结构化大纲。
                            </p>
                            <button disabled className="flex items-center gap-2 text-sm text-amber-500 opacity-50 cursor-not-allowed font-medium">
                                开始辩论 <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Writing Master (Moved from Delivery) */}
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 relative overflow-hidden hover:border-blue-500/50 transition-colors cursor-pointer group">
                    <div className="absolute top-4 right-4 bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs px-2 py-1 rounded">
                        等待打通业务侧
                    </div>
                    <div className="flex items-start gap-5 relative z-10">
                        <div className="p-4 bg-slate-700 text-slate-300 rounded-xl group-hover:bg-blue-500/10 group-hover:text-blue-400 transition-colors">
                            <PenTool className="w-8 h-8" />
                        </div>
                        <div className="pt-1">
                            <h3 className="text-xl font-semibold mb-2 text-slate-100">写作大师 (Writing Master)</h3>
                            <p className="text-slate-400 leading-relaxed mb-4">
                                承接对话产出的 Mini 论文或结构化大纲，进行深度扩写与内容强化。生成可供导演模块直接使用的长篇脚本文案。
                            </p>
                            <button className="flex items-center gap-2 text-sm text-blue-400 font-medium group-hover:translate-x-1 transition-transform">
                                进入工作室 <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
};
