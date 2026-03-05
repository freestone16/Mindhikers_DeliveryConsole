import { Check, Code, Video, Film, Globe, Camera, BarChart3 } from 'lucide-react';
import type { BRollType } from '../../types';

interface BRollSelectorProps {
  selected: BRollType[];
  onChange: (selected: BRollType[]) => void;
  disabled?: boolean;
}

const BROLL_OPTIONS: { type: BRollType; label: string; icon: typeof Code; description: string }[] = [
  { type: 'remotion', label: 'A. Remotion 动画', icon: Code, description: '代码驱动动画' },
  { type: 'seedance', label: 'B. 文生视频', icon: Video, description: 'AI生成视频' },
  { type: 'artlist', label: 'C. Artlist 实拍', icon: Film, description: '素材库实拍' },
  { type: 'internet-clip', label: 'D. 互联网素材', icon: Globe, description: '真实片段建议' },
  { type: 'user-capture', label: 'E. 用户截图/录屏', icon: Camera, description: '自行采集素材' },
  { type: 'infographic', label: 'F. 信息图', icon: BarChart3, description: '结构化逻辑图示' },
];

export const BRollSelector = ({ selected, onChange, disabled }: BRollSelectorProps) => {
  const toggleOption = (type: BRollType) => {
    if (disabled) return;
    if (selected.includes(type)) {
      onChange(selected.filter(t => t !== type));
    } else {
      onChange([...selected, type]);
    }
  };

  return (
    <div className="flex gap-3">
      {BROLL_OPTIONS.map(({ type, label, icon: Icon, description }) => {
        const isSelected = selected.includes(type);
        return (
          <button
            key={type}
            onClick={() => toggleOption(type)}
            disabled={disabled}
            className={`flex-1 flex flex-col items-center gap-2 p-3 rounded-lg border transition-all
              ${isSelected
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-slate-700 bg-slate-800/30 hover:border-slate-500'}
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center
              ${isSelected ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-700 text-slate-400'}`}>
              <Icon className="w-4 h-4" />
            </div>
            <span className="text-sm font-medium text-white">{label}</span>
            <span className="text-xs text-slate-500">{description}</span>
            {isSelected && <Check className="w-4 h-4 text-blue-400" />}
          </button>
        );
      })}
    </div>
  );
};
