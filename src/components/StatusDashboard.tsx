import type { DeliveryState } from '../types';
import { PieChart, MonitorPlay, Music, Image as ImageIcon, Megaphone, Video, CheckCircle2, Clock, Circle } from 'lucide-react';

interface StatusDashboardProps {
    state: DeliveryState;
}

export const StatusDashboard = ({ state }: StatusDashboardProps) => {
    const modules = state.modules;
    if (!modules) {
        return null;
    }

    const directorTotal = modules.director.items.length;
    const directorDone = modules.director.items.reduce((acc: number, i: any) => acc + (i.checked ? 1 : 0), 0);

    const musicTotal = modules.music.items.length;
    const musicDone = modules.music.items.reduce((acc: number, i: any) => acc + (i.checked ? 1 : 0), 0);

    const marketingSubmitted = modules.marketing.isSubmitted;

    const shortsTotal = (modules.shorts as any)?.items?.length || (modules.shorts as any)?.scripts?.length || 0;
    const shortsDone = (modules.shorts as any)?.items?.filter((s: any) => s.status === 'published').length || 0;

    const totalTasks = directorTotal + musicTotal + 1 + shortsTotal;
    const totalDone = directorDone + musicDone + (marketingSubmitted ? 1 : 0) + shortsDone;
    const progress = totalTasks > 0 ? Math.round((totalDone / totalTasks) * 100) : 0;

    const StatusItem = ({ icon: Icon, label, phase, done, total, colorClass }: any) => (
        <div className={`flex items-center gap-3 px-4 py-2 rounded-lg border border-slate-700/50 bg-slate-900/50 hover:bg-slate-800 transition-colors cursor-default min-w-[140px]`}>
            <div className={`p-1.5 rounded-full ${colorClass.replace('text-', 'bg-').replace('400', '500/20').replace('500', '500/20')}`}>
                <Icon className={`w-4 h-4 ${colorClass}`} />
            </div>
            <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">{label}</span>
                <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white leading-none">
                        {phase === 1 ? 'Concept' : 'Exec'}
                    </span>
                    {phase === 2 && (
                        <span className="text-[10px] text-slate-400 font-mono">
                            {done}/{total}
                        </span>
                    )}
                </div>
            </div>
            <div className="ml-auto">
                {phase === 2 && done === total && total > 0 ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                ) : phase === 2 ? (
                    <Circle className="w-4 h-4 text-slate-600" />
                ) : (
                    <Clock className="w-4 h-4 text-yellow-500" />
                )}
            </div>
        </div>
    );

    return (
        <div className="sticky top-0 z-50 -mx-6 px-6 py-4 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 mb-8 shadow-sm">
            <div className="flex items-center justify-between gap-2 max-w-7xl mx-auto overflow-x-auto no-scrollbar">

                {/* 1. Total Progress */}
                <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-blue-950/30 border border-blue-900/50 min-w-[160px]">
                    <PieChart className="w-8 h-8 text-blue-500" />
                    <div>
                        <div className="text-[10px] uppercase font-bold text-blue-400 tracking-wider">Total Progress</div>
                        <div className="text-xl font-bold text-white leading-none">{progress}%</div>
                    </div>
                </div>

                <div className="h-8 w-px bg-slate-800 mx-2" />

                {/* 2. Visual */}
                <StatusItem
                    icon={MonitorPlay}
                    label="Visual"
                    phase={modules.director.phase}
                    done={directorDone}
                    total={directorTotal}
                    colorClass="text-blue-400"
                />

                {/* 3. Audio */}
                <StatusItem
                    icon={Music}
                    label="Audio"
                    phase={modules.music.phase}
                    done={musicDone}
                    total={musicTotal}
                    colorClass="text-purple-400"
                />

                {/* 4. Thumbnail */}
                <div className={`flex items-center gap-3 px-4 py-2 rounded-lg border border-slate-700/50 bg-slate-900/50 min-w-[140px]`}>
                    <div className="p-1.5 rounded-full bg-pink-500/20">
                        <ImageIcon className="w-4 h-4 text-pink-400" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Thumbnail</span>
                        <div className="text-sm font-bold text-white leading-none">
                            {modules.thumbnail.variants.length > 0 ? 'Review' : 'Pending'}
                        </div>
                    </div>
                </div>

                {/* 5. Marketing */}
                <div className={`flex items-center gap-3 px-4 py-2 rounded-lg border border-slate-700/50 bg-slate-900/50 min-w-[140px]`}>
                    <div className="p-1.5 rounded-full bg-orange-500/20">
                        <Megaphone className="w-4 h-4 text-orange-400" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Marketing</span>
                        <div className="text-sm font-bold text-white leading-none">
                            {marketingSubmitted ? 'Approved' : 'Review'}
                        </div>
                    </div>
                    {marketingSubmitted && <CheckCircle2 className="w-4 h-4 text-green-500 ml-auto" />}
                </div>

                {/* 6. Shorts */}
                <div className={`flex items-center gap-3 px-4 py-2 rounded-lg border border-slate-700/50 bg-slate-900/50 min-w-[140px]`}>
                    <div className="p-1.5 rounded-full bg-cyan-500/20">
                        <Video className="w-4 h-4 text-cyan-400" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Shorts</span>
                        <div className="text-sm font-bold text-white leading-none">
                            {shortsTotal > 0 ? `${shortsDone}/${shortsTotal}` : 'None'}
                        </div>
                    </div>
                    {shortsTotal > 0 && shortsDone === shortsTotal && <CheckCircle2 className="w-4 h-4 text-green-500 ml-auto" />}
                </div>

            </div>
        </div>
    );
};
