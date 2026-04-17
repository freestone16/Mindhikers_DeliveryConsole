import { forwardRef } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';
import styles from './HandoffPanel.module.css';

export interface Crumb {
  label: string;
  isCurrent?: boolean;
}

export interface HandoffPanelProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title: ReactNode;
  subtitle?: string;
  crumbs?: Crumb[];
}

export const HandoffPanel = forwardRef<HTMLDivElement, HandoffPanelProps>(
  ({ title, subtitle, crumbs, className, children, ...rest }, ref) => (
    <div ref={ref} className={clsx(styles.root, className)} {...rest}>
      {crumbs && crumbs.length > 0 && (
        <div className={styles.crumbs}>
          {crumbs.map((c, i) => (
            <span key={i} className={clsx(styles.crumb, c.isCurrent && styles.crumbCurrent)}>
              {i > 0 && <span className={styles.sep}>/</span>}
              {c.label}
            </span>
          ))}
        </div>
      )}
      <h2 className={styles.title}>{title}</h2>
      {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      {children}
    </div>
  ),
);

HandoffPanel.displayName = 'HandoffPanel';
