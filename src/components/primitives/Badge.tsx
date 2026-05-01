import { forwardRef } from 'react';
import type { HTMLAttributes } from 'react';
import clsx from 'clsx';
import styles from './Badge.module.css';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'ochre' | 'success' | 'warning' | 'error';
  children: React.ReactNode;
}

const variantMap = {
  default: styles.variantDefault,
  ochre: styles.variantOchre,
  success: styles.variantSuccess,
  warning: styles.variantWarning,
  error: styles.variantError,
} as const;

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = 'default', children, className, ...rest }, ref) => (
    <span
      ref={ref}
      className={clsx(styles.root, variantMap[variant], className)}
      {...rest}
    >
      {children}
    </span>
  ),
);

Badge.displayName = 'Badge';
