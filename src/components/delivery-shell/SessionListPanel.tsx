import type { ScriptFile } from './DeliveryShellLayout';

interface SessionListPanelProps {
  scripts: ScriptFile[];
  selectedScriptPath?: string;
  onSelectScript: (projectId: string, path: string) => Promise<boolean>;
  expertLabel: string;
  projectId: string;
}

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  if (diff < 60_000) return '刚刚';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  if (diff < 172_800_000) return '昨日';
  return `${Math.floor(diff / 86_400_000)}d`;
}

export function SessionListPanel({
  scripts,
  selectedScriptPath,
  onSelectScript,
  expertLabel,
  projectId,
}: SessionListPanelProps) {
  const sorted = [...scripts].sort(
    (a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime()
  );

  return (
    <div className="shell-rail__section shell-sessionlist">
      <div className="shell-rail__label">
        <span>SESSIONS · {expertLabel.toUpperCase()}</span>
      </div>

      {sorted.length === 0 ? (
        <div className="shell-sessionlist__empty">
          暂无文稿，请先在顶栏选择项目
        </div>
      ) : (
        <div className="shell-sessionlist__list">
          {sorted.map(script => {
            const isActive = script.path === selectedScriptPath;
            return (
              <button
                key={script.path}
                className={`shell-session${isActive ? ' shell-session--active' : ''}`}
                onClick={() => { if (!isActive) onSelectScript(projectId, script.path); }}
                title={script.name}
              >
                <div className="shell-session__dot" />
                <div className="shell-session__body">
                  <span className="shell-session__name">{script.name}</span>
                </div>
                <span className="shell-session__time">{relativeTime(script.modifiedAt)}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
