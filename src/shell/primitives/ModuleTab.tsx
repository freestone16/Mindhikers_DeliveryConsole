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
}

export const ModuleTab = forwardRef<HTMLButtonElement, ModuleTabProps>(
  ({ icon, label, active, shortcut, isSlot, className, ...rest }, ref) => (
    <button
      ref={ref}
      aria-current={active || undefined}
      className={clsx(
        styles.root,
        active && styles.rootActive,
        isSlot && styles.rootSlot,
        className,
      )}
      {...rest}
    >
      {!isSlot && <span className={styles.glyph}>{icon}</span>}
      <span className={styles.name}>{label}</span>
      {shortcut && !isSlot && <span className={styles.kbd}>{shortcut}</span>}
    </button>
  ),
);

ModuleTab.displayName = 'ModuleTab';
