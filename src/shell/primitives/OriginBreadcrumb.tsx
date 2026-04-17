import { forwardRef } from 'react';
import type { HTMLAttributes } from 'react';
import clsx from 'clsx';
import styles from './OriginBreadcrumb.module.css';

export interface OriginCrumb {
  module: string;
  sessionId: string;
  label: string;
  archived?: boolean;
}

export interface OriginBreadcrumbProps extends HTMLAttributes<HTMLDivElement> {
  crumbs: OriginCrumb[];
  onNavigate?: (crumb: OriginCrumb) => void;
  className?: string;
}

export const OriginBreadcrumb = forwardRef<HTMLDivElement, OriginBreadcrumbProps>(
  ({ crumbs, onNavigate, className, ...rest }, ref) => {
    if (crumbs.length === 0) {
      return null;
    }

    return (
      <div ref={ref} className={clsx(styles.root, className)} {...rest}>
        {crumbs.map((crumb, index) => (
          <span key={`${crumb.module}:${crumb.sessionId}`} className={styles.item}>
            {index > 0 && <span className={styles.separator}>&gt;</span>}
            <button
              type="button"
              className={clsx(styles.crumb, crumb.archived && styles.crumbArchived)}
              onClick={() => onNavigate?.(crumb)}
            >
              {crumb.label}
            </button>
          </span>
        ))}
      </div>
    );
  },
);

OriginBreadcrumb.displayName = 'OriginBreadcrumb';
