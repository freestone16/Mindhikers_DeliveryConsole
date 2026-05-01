import { PERSONA_NAME_MAP } from '../types';
import type { Spike } from '../types';
import { Button } from '../../../components/primitives';

interface SpikeLibraryProps {
  spikes: Spike[];
  onStartDeepDive: (spikeId: string, openingQuestion?: string) => void;
  onSendToCrucible?: () => void;
}

const TENSION_COLORS: Record<number, string> = {
  1: '#16a34a',
  2: '#65a30d',
  3: '#d97706',
  4: '#ea580c',
  5: '#dc2626',
};

export const SpikeLibrary = ({ spikes, onStartDeepDive, onSendToCrucible }: SpikeLibraryProps) => {
  if (spikes.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-[var(--gc-text-secondary)]">
        Spike 发现 ({spikes.length})
      </h3>
      <div className="grid gap-3 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {spikes.map((spike) => {
          const tension = spike.tensionLevel ?? 3;
          const name = PERSONA_NAME_MAP[spike.sourceSpeaker] ?? spike.sourceSpeaker;

          return (
            <div
              key={spike.id}
              className="rounded-xl border border-[var(--gc-line-subtle)] bg-[var(--gc-bg-raised)] p-4 transition hover:border-[var(--gc-accent)]"
            >
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-[var(--gc-text-secondary)]">{name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: TENSION_COLORS[tension] ?? TENSION_COLORS[3] }}
                  />
                  <span className="text-xs text-[var(--gc-text-tertiary)]">
                    张力 {tension}/5
                  </span>
                </div>
              </div>

              <h4 className="mb-1 text-sm font-medium text-[var(--gc-text-primary)]">
                {spike.title}
              </h4>
              <p className="mb-3 line-clamp-3 text-xs leading-relaxed text-[var(--gc-text-secondary)]">
                {spike.summary}
              </p>

              {spike.isFallback ? (
                <div className="text-xs text-[var(--gc-text-tertiary)] italic">
                  规则兜底提取
                </div>
              ) : (
                <Button
                  variant="ochre"
                  size="sm"
                  onClick={() => onStartDeepDive(spike.id, spike.bridgeHint)}
                >
                  发起深聊
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {onSendToCrucible && (
        <div className="mt-4 flex justify-center">
          <Button
            variant="primary"
            onClick={onSendToCrucible}
          >
            送入坩埚
          </Button>
        </div>
      )}
    </div>
  );
};
