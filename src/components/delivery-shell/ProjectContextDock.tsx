interface ProjectContextDockProps {
  projectName?: string;
  scriptName?: string;
  modelName?: string;
  outputDir?: string;
}

function DockCell({ label, value }: { label: string; value?: string }) {
  return (
    <div className="shell-dock__cell">
      <span className="shell-dock__label">{label}</span>
      <span className="shell-dock__value" title={value}>
        {value || '—'}
      </span>
    </div>
  );
}

export function ProjectContextDock({
  projectName,
  scriptName,
  modelName,
  outputDir,
}: ProjectContextDockProps) {
  return (
    <div className="shell-dock shell-dock--stacked">
      <DockCell label="当前项目" value={projectName} />
      <DockCell label="当前文稿" value={scriptName} />
      <DockCell label="全局模型" value={modelName} />
      <DockCell label="输出目录" value={outputDir} />
    </div>
  );
}
