import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface DeliveryStatusBarProps {
  runtimeData?: {
    currentModel: { provider: string; model: string } | null;
    logs: { timestamp: number; type: string; message: string }[];
    isLoading: boolean;
    startTime: number | null;
  };
  socket?: any;
}

export function DeliveryStatusBar({ runtimeData, socket }: DeliveryStatusBarProps) {
  const [elapsed, setElapsed] = useState<number>(0);
  const isConnected = socket?.connected ?? false;

  useEffect(() => {
    if (!runtimeData?.isLoading || !runtimeData?.startTime) {
      setElapsed(0);
      return;
    }
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - runtimeData.startTime!) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [runtimeData?.isLoading, runtimeData?.startTime]);

  const formatElapsed = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <footer
      className="shrink-0 border-t border-[#e4dbcc] px-4 py-1.5 text-[11px] flex items-center justify-end gap-3"
      style={{ background: 'rgba(249, 244, 236, 0.9)', backdropFilter: 'blur(12px)' }}
    >
      {runtimeData?.isLoading && (
        <div className="flex items-center gap-1.5">
          <Loader2 className="w-3 h-3 text-[#c97545] animate-spin" />
          <span className="text-[#c97545]">生成中 {formatElapsed(elapsed)}</span>
        </div>
      )}

      <div className="flex items-center gap-1.5">
        <span
          className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-[#62835c]' : 'bg-red-500'}`}
          style={isConnected ? { boxShadow: '0 0 6px rgba(98, 131, 92, 0.5)' } : {}}
        />
        <span className="text-[#8f8372]">{isConnected ? 'DIRECTOR ONLINE' : 'DISCONNECTED'}</span>
      </div>
    </footer>
  );
}
