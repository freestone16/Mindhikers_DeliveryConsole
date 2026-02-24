import { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { ExpertNav } from './components/ExpertNav';
import { ExpertPage } from './components/ExpertPage';
import { DirectorSection } from './components/DirectorSection';
import { VisualAuditPage } from './components/VisualAuditPage';
import { AccountsHub } from './components/AccountsHub';
import { PublishComposer } from './components/PublishComposer';
import { DistributionQueue } from './components/DistributionQueue';
import { useDeliveryStore } from './hooks/useDeliveryStore';
import { Loader2, Users, Send, Clock } from 'lucide-react';
import { EXPERTS } from './config/experts';
import type { ExpertStatus } from './types';
import { StatusFooter } from './components/StatusFooter';

type ModuleType = 'crucible' | 'delivery' | 'distribution';
type DistributionPage = 'accounts' | 'composer' | 'queue';

function App() {
    const { state, isConnected, selectScript, updateState } = useDeliveryStore();
    const [activeExpertId, setActiveExpertId] = useState('Director');
    const [activeModule, setActiveModule] = useState<ModuleType>('delivery');
    const [activeDistributionPage, setActiveDistributionPage] = useState<DistributionPage>('composer');

    useEffect(() => {
        if (state.activeExpertId) {
            setActiveExpertId(state.activeExpertId);
        }
    }, [state.activeExpertId]);

    const handleSelectExpert = (expertId: string) => {
        setActiveExpertId(expertId);
        updateState({
            ...state,
            activeExpertId: expertId
        });
    };

    const handleStartWork = async (expertId: string) => {
        if (!state.selectedScript) {
            alert('请先选择文稿');
            return;
        }

        const expert = EXPERTS.find(e => e.id === expertId);
        if (!expert) return;

        try {
            const res = await fetch('http://localhost:3002/api/experts/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    expertId,
                    scriptPath: state.selectedScript.path
                })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || '启动失败');
            }
            alert('专家任务已启动');
        } catch (e: any) {
            console.error('Start work error:', e);
            alert(`启动失败: ${e.message}`);
        }
    };

    const handleCancel = (expertId: string) => {
        const experts = state.experts || {};
        const currentExpert = experts[expertId] || {};

        updateState({
            ...state,
            experts: {
                ...experts,
                [expertId]: {
                    ...currentExpert,
                    status: 'idle',
                    logs: []
                }
            }
        });
    };

    const handleRerun = (expertId: string) => {
        handleStartWork(expertId);
    };

    const expertStatuses = useMemo(() => {
        const statuses: Record<string, { status: ExpertStatus }> = {};
        EXPERTS.forEach(e => {
            const rawStatus = state?.experts?.[e.id]?.status;
            statuses[e.id] = { status: (rawStatus as ExpertStatus) || 'idle' };
        });
        return statuses;
    }, [state?.experts]);

    const currentExpertWork = state.experts?.[activeExpertId];

    if (!isConnected && !state.projectId) {
        return (
            <div className="bg-[#0b1529] min-h-screen flex items-center justify-center text-white">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    <p className="text-slate-400">Connecting to Local Secure Server...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#060b14] font-sans text-slate-200 pb-20">
            <Header
                projectId={state.projectId}
                selectedScriptPath={state.selectedScript?.path}
                onSelectScript={selectScript}
                activeModule={activeModule}
                onModuleChange={setActiveModule}
            />

            {activeModule === 'crucible' ? (
                <main className="max-w-7xl mx-auto px-6 py-20 text-center text-slate-400">
                    <h2 className="text-2xl font-bold mb-4 text-amber-500">🔥 黄金坩埚 (Golden Crucible)</h2>
                    <p>苏格拉底对话界面与状态机模块即将接入...</p>
                </main>
            ) : activeModule === 'delivery' ? (
                <>
                    <ExpertNav
                        activeExpertId={activeExpertId}
                        expertStatuses={expertStatuses}
                        onSelectExpert={handleSelectExpert}
                    />

                    {activeExpertId === 'VisualAudit' ? (
                        <main className="max-w-7xl mx-auto px-6 py-8">
                            <VisualAuditPage />
                        </main>
                    ) : activeExpertId === 'Director' ? (
                        <main className="max-w-7xl mx-auto px-6 py-8">
                            <DirectorSection
                                data={state.modules.director}
                                projectId={state.projectId}
                                scriptPath={state.selectedScript?.path || ''}
                                onUpdate={(newData) => updateState({
                                    ...state,
                                    modules: { ...state.modules, director: newData }
                                })}
                            />
                        </main>
                    ) : (
                        <main className="max-w-7xl mx-auto px-6 py-8">
                            <ExpertPage
                                expertId={activeExpertId}
                                projectId={state.projectId}
                                expertWork={currentExpertWork}
                                selectedScript={state.selectedScript}
                                onStartWork={handleStartWork}
                                onCancel={handleCancel}
                                onRerun={handleRerun}
                            />
                        </main>
                    )}
                </>
            ) : (
                <DistributionLayout
                    activePage={activeDistributionPage}
                    onPageChange={setActiveDistributionPage}
                />
            )}

            <StatusFooter isConnected={isConnected} />
        </div>
    );
}

const DistributionLayout = ({ activePage, onPageChange }: { activePage: DistributionPage; onPageChange: (page: DistributionPage) => void }) => {
    const navItems = [
        { id: 'accounts' as DistributionPage, label: 'Accounts Hub', icon: <Users className="w-4 h-4" /> },
        { id: 'composer' as DistributionPage, label: 'Publish Composer', icon: <Send className="w-4 h-4" /> },
        { id: 'queue' as DistributionPage, label: 'Queue', icon: <Clock className="w-4 h-4" /> },
    ];

    return (
        <>
            <div className="bg-[#0b1529]/60 border-b border-blue-900/30 backdrop-blur-md">
                <div className="max-w-7xl mx-auto px-6">
                    <nav className="flex gap-1 py-2">
                        {navItems.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => onPageChange(item.id)}
                                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activePage === item.id
                                    ? 'bg-blue-600 text-white'
                                    : 'text-slate-400 hover:text-blue-200 hover:bg-[#152342]/50'
                                    }`}
                            >
                                {item.icon}
                                {item.label}
                            </button>
                        ))}
                    </nav>
                </div>
            </div>
            <main className="max-w-7xl mx-auto px-6 py-8">
                {activePage === 'accounts' && <AccountsHub />}
                {activePage === 'composer' && <PublishComposer />}
                {activePage === 'queue' && <DistributionQueue />}
            </main>
        </>
    );
};

export default App;
