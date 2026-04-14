import { PERSONA_EMOJI_MAP, PERSONA_NAME_MAP } from './types';
import type { Spike } from './types';

interface SpikeLibraryProps {
  spikes: Spike[];
  onStartDeepDive: (spikeId: string, openingQuestion?: string) => void;
}

const TENSION_COLORS: Record<number, string> = {
  1: '#16a34a',
  2: '#65a30d',
  3: '#d97706',
  4: '#ea580c',
  5: '#dc2626',
};

export const SpikeLibrary = ({ spikes, onStartDeepDive }: SpikeLibraryProps) => {
  if (spikes.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-[var(--ink-2)]">
        Spike 发现 ({spikes.length})
      </h3>
      <div className="grid gap-3 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {spikes.map((spike) => {
          const tension = spike.tensionLevel ?? 3;
          const emoji = PERSONA_EMOJI_MAP[spike.sourceSpeaker] ?? '💬';
          const name = PERSONA_NAME_MAP[spike.sourceSpeaker] ?? spike.sourceSpeaker;

          return (
            <div
              key={spike.id}
              className="rounded-xl border border-[var(--line-soft)] bg-[var(--surface-0)] p-4 transition hover:border-[var(--accent-soft)]"
            >
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <span>{emoji}</span>
                  <span className="text-[var(--ink-2)]">{name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: TENSION_COLORS[tension] ?? TENSION_COLORS[3] }}
                  />
                  <span className="text-xs text-[var(--ink-3)]">
                    张力 {tension}/5
                  </span>
                </div>
              </div>

              <h4 className="mb-1 text-sm font-medium text-[var(--ink-1)]">
                {spike.title}
              </h4>
              <p className="mb-3 line-clamp-3 text-xs leading-relaxed text-[var(--ink-2)]">
                {spike.summary}
              </p>

              {spike.isFallback ? (
                <div className="text-xs text-[var(--ink-3)] italic">
                  规则兜底提取
                </div>
              ) : (
                <button
                  type="button"
                  className="rounded-lg px-3 py-1.5 text-xs font-medium transition"
                  style={{
                    backgroundColor: 'rgba(180, 83, 9, 0.08)',
                    color: '#b45309',
                  }}
                  onClick={() => onStartDeepDive(spike.id, spike.bridgeHint)}
                >
                  🔬 发起深聊
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
