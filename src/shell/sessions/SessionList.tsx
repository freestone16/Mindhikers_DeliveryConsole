import clsx from 'clsx';
import { SidebarItem } from '../primitives';
import type { ModuleSessionItem } from '../../modules/types';
import styles from './SessionList.module.css';

export interface SessionListProps {
  items: ModuleSessionItem[];
  activeSessionId?: string | null;
  emptyLabel?: string;
  onSessionChange?: (sessionId: string) => void;
}

export function SessionList({
  items,
  activeSessionId,
  emptyLabel = '当前模块还没有会话',
  onSessionChange,
}: SessionListProps) {
  if (items.length === 0) {
    return <div className={styles.empty}>{emptyLabel}</div>;
  }

  return (
    <div className={styles.list}>
      {items.map((item) => {
        const active = item.id === activeSessionId;
        return (
          <SidebarItem
            key={item.id}
            title={item.label}
            meta={item.meta || item.description}
            active={active}
            className={clsx(styles.item, active && styles.itemActive)}
            onClick={() => onSessionChange?.(item.id)}
          />
        );
      })}
    </div>
  );
}
