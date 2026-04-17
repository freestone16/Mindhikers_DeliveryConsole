import type { HTMLAttributes } from 'react';
import clsx from 'clsx';
import styles from './Chip.module.css';

export interface ChipProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'active';
  children: React.ReactNode;
}

export const Chip = ({
  variant = 'default',
  children,
  className,
  ...rest
}: ChipProps) => (
  <span
    className={clsx(
      styles.root,
      variant === 'active' ? styles.variantActive : styles.variantDefault,
      className,
    )}
    {...rest}
  >
    {children}
  </span>
);

Chip.displayName = 'Chip';
