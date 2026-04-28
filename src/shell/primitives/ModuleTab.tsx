import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';
import styles from './ModuleTab.module.css';

export interface ModuleTabProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  label: string;
  active?: boolean;
  shortcut?: string;
  isSlot?: boolean;
  collapsed?: boolean;
}

export const ModuleTab = forwardRef<HTMLButtonElement, ModuleTabProps>(
  ({ icon, label, active, shortcut, isSlot, collapsed, className, ...rest }, ref) => (
    <button
      ref={ref}
      aria-current={active || undefined}
      aria-label={collapsed ? label : undefined}
      title={collapsed ? label : undefined}
      className={clsx(
        styles.root,
        active && styles.rootActive,
        isSlot && styles.rootSlot,
        collapsed && styles.rootCollapsed,
        className,
      )}
      {...rest}
    >
      {!isSlot && <span className={styles.glyph}>{icon}</span>}
      {!collapsed && <span className={styles.name}>{label}</span>}
      {shortcut && !isSlot && !collapsed && <span className={styles.kbd}>{shortcut}</span>}
    </button>
  ),
);

ModuleTab.displayName = 'ModuleTab';
