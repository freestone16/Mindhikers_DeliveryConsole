import { Check, Code, Video, Film, Globe, Camera, BarChart3 } from 'lucide-react';
import type { BRollType } from '../../types';

interface BRollSelectorProps {
  selected: BRollType[];
  onChange: (selected: BRollType[]) => void;
  disabled?: boolean;
  /** Restrict which types to show (default: all 6) */
  types?: BRollType[];
}

const BROLL_OPTIONS: { type: BRollType; label: string; icon: typeof Code; description: string }[] = [
  { type: 'remotion', label: 'A. Remotion 动画', icon: Code, description: '代码驱动动画' },
  { type: 'seedance', label: 'B. 文生视频', icon: Video, description: 'AI生成视频' },
  { type: 'artlist', label: 'C. Artlist 实拍', icon: Film, description: '素材库实拍' },
  { type: 'internet-clip', label: 'D. 互联网素材', icon: Globe, description: '真实片段建议' },
  { type: 'user-capture', label: 'E. 用户截图/录屏', icon: Camera, description: '自行采集素材' },
  { type: 'infographic', label: 'F. 信息图', icon: BarChart3, description: '结构化逻辑图示' },
];

export const BRollSelector = ({ selected, onChange, disabled, types }: BRollSelectorProps) => {
  const visibleOptions = types
    ? BROLL_OPTIONS.filter(o => types.includes(o.type))
    : BROLL_OPTIONS;

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
      {visibleOptions.map(({ type, label, icon: Icon, description }) => {
        const isSelected = selected.includes(type);
        return (
          <button
            key={type}
            onClick={() => toggleOption(type)}
            disabled={disabled}
            className={`flex-1 flex flex-col items-center gap-2 p-3 rounded-lg border transition-all
              ${isSelected
                ? 'border-[#c97545] bg-[#c97545]/10'
                : 'border-[#e4dbcc] bg-[#f4efe5]/60 hover:border-[#d8c8ae]'}
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center
              ${isSelected ? 'bg-[#c97545]/20 text-[#c97545]' : 'bg-[#e4dbcc] text-[#8f8372]'}`}>
              <Icon className="w-4 h-4" />
            </div>
            <span className="text-sm font-medium text-[#342d24]">{label}</span>
            <span className="text-xs text-[#8f8372]">{description}</span>
            {isSelected && <Check className="w-4 h-4 text-[#c97545]" />}
          </button>
        );
      })}
    </div>
  );
};
