import { forwardRef } from 'react';
import type { HTMLAttributes } from 'react';
import clsx from 'clsx';
import styles from './SidebarItem.module.css';

export interface SidebarItemProps extends HTMLAttributes<HTMLButtonElement> {
  title: string;
  meta?: string;
  active?: boolean;
}

export const SidebarItem = forwardRef<HTMLButtonElement, SidebarItemProps>(
  ({ title, meta, active, className, ...rest }, ref) => (
    <button
      ref={ref}
      aria-current={active || undefined}
      className={clsx(styles.root, active && styles.rootActive, className)}
      {...rest}
    >
      <span className={styles.title}>{title}</span>
      {meta && <span className={styles.meta}>{meta}</span>}
    </button>
  ),
);

SidebarItem.displayName = 'SidebarItem';
