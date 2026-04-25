import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { ExpertPage } from './components/ExpertPage';
import { DirectorSection } from './components/DirectorSection';
import { ShortsSection } from './components/ShortsSection';
import { MarketingSection } from './components/MarketingSection';
import { VisualAuditPage } from './components/VisualAuditPage';
import { AccountsHub } from './components/AccountsHub';
import { PublishComposer } from './components/PublishComposer';
import { DistributionQueue } from './components/DistributionQueue';
import { DeliveryShellLayout } from './components/delivery-shell/DeliveryShellLayout';
import { useDeliveryStore, INITIAL_STATE } from './hooks/useDeliveryStore';
import { Loader2, Users, Send, Clock } from 'lucide-react';
import { StatusFooter } from './components/StatusFooter';
import { CrucibleHome } from './components/CrucibleHome';
import { LLMConfigPage } from './components/LLMConfigPage';
import { DirectorUIDemoPage } from './components/DirectorUIDemoPage';

type ModuleType = 'crucible' | 'delivery' | 'distribution';
type DistributionPage = 'accounts' | 'composer' | 'queue';

function useHashRoute() {
    const [hash, setHash] = useState(() => window.location.hash.slice(1) || '/');
    useEffect(() => {
        const handleHashChange = () => {
            setHash(window.location.hash.slice(1) || '/');
        };
        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);
    return hash;
}

function App() {
    const { state, isConnected, selectScript, socket, setState } = useDeliveryStore();
    const [activeExpertId, setActiveExpertId] = useState('Director');
    const [activeModule, setActiveModule] = useState<ModuleType>('delivery');
    const [activeDistributionPage, setActiveDistributionPage] = useState<DistributionPage>('composer');

    const [runtimeData, setRuntimeData] = useState<{
        currentModel: { provider: string; model: string } | null;
        logs: { timestamp: number; type: string; message: string }[];
        isLoading: boolean;
        startTime: number | null;
    }>({ currentModel: null, logs: [], isLoading: false, startTime: null });

    const handleSelectProject = (projectId: string) => {
        (window as any).__currentProjectId = projectId;
        try { localStorage.setItem('dc:lastProjectId', projectId); } catch {}
        setState({
            ...INITIAL_STATE,
            projectId: projectId,
            lastUpdated: new Date().toISOString()
        });
        if (socket) {
            socket.emit('select-project', projectId);
        }
    };

    // 🔑 页面刷新时自动恢复上次选择的项目
    useEffect(() => {
        if (state.projectId) {
            (window as any).__currentProjectId = state.projectId;
            return;
        }
        const saved = localStorage.getItem('dc:lastProjectId');
        if (saved) {
            handleSelectProject(saved);
        }
    }, []);

    const handleSelectExpert = (expertId: string) => {
        setActiveExpertId(expertId);
    };

    const handleModuleChange = (module: ModuleType) => {
        setActiveModule(module);
    };

    const handleStartWork = async (expertId: string) => {
        if (!state.selectedScript) {
            alert('请先选择文稿');
            return;
        }

        try {
            const res = await fetch('/api/experts/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    expertId,
                    scriptPath: state.selectedScript.path,
                    projectId: state.projectId
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

    const handleCancel = async (expertId: string) => {
        if (socket) {
            socket.emit('update-expert-data', {
                projectId: state.projectId,
                expertId,
                data: { status: 'idle', logs: [] }
            });
        }
    };

    const handleRerun = (expertId: string) => {
        handleStartWork(expertId);
    };

    const hashRoute = useHashRoute();

    if (hashRoute === '/llm-config') {
        return <LLMConfigPage onClose={() => window.location.hash = '/'} />;
    }

    if (hashRoute === '/director-ui-demo') {
        return <DirectorUIDemoPage />;
    }

    if (!isConnected) {
        return (
            <div className="bg-[#0b1529] min-h-screen flex items-center justify-center text-white">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    <p className="text-slate-400">Connecting to Local Secure Server...</p>
                </div>
            </div>
        );
    }

    /* ── Delivery module: own shell manages topbar & theming ── */
    if (activeModule === 'delivery') {
        return (
            <DeliveryShellLayout
                activeExpertId={activeExpertId}
                onExpertChange={handleSelectExpert}
                projectId={state.projectId}
                selectedScriptPath={state.selectedScript?.path}
                onSelectProject={handleSelectProject}
                onSelectScript={selectScript}
                socket={socket}
                runtimeData={runtimeData}
            >
                <div style={{ padding: '24px 28px', minHeight: '100%', background: '#f7f2ea', width: '100%' }}>
                    {activeExpertId === 'VisualAudit' ? (
                        <VisualAuditPage />
                    ) : activeExpertId === 'Director' ? (
                        <DirectorSection
                            projectId={state.projectId}
                            scriptPath={state.selectedScript?.path || ''}
                            socket={socket}
                            onRuntimeDataChange={setRuntimeData}
                        />
                    ) : activeExpertId === 'ShortsMaster' ? (
                        <ShortsSection
                            projectId={state.projectId}
                            scriptPath={state.selectedScript?.path || ''}
                            socket={socket}
                        />
                    ) : activeExpertId === 'MarketingMaster' ? (
                        <MarketingSection
                            projectId={state.projectId}
                            scriptPath={state.selectedScript?.path || ''}
                            socket={socket}
                        />
                    ) : (
                        <ExpertPage
                            expertId={activeExpertId}
                            projectId={state.projectId}
                            selectedScript={state.selectedScript}
                            onStartWork={handleStartWork}
                            onCancel={handleCancel}
                            onRerun={handleRerun}
                        />
                    )}
                </div>
            </DeliveryShellLayout>
        );
    }

    /* ── Other modules: original dark theme ── */
    return (
        <div className="h-screen flex flex-col bg-[#060b14] font-sans text-slate-200">
            <Header
                projectId={state.projectId}
                selectedScriptPath={state.selectedScript?.path}
                onSelectProject={handleSelectProject}
                onSelectScript={selectScript}
                activeModule={activeModule}
                onModuleChange={handleModuleChange}
            />

            {activeModule === 'crucible' ? (
                <main className="max-w-7xl mx-auto px-6 py-20">
                    <CrucibleHome />
                </main>
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
