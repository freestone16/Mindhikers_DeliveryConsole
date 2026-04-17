import { forwardRef } from 'react';
import type { HTMLAttributes } from 'react';
import clsx from 'clsx';
import styles from './Card.module.css';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'raised' | 'ochre';
  padding?: 'default' | 'compact';
}

const variantMap = {
  default: styles.variantDefault,
  raised: styles.variantRaised,
  ochre: styles.variantOchre,
} as const;

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    { variant = 'default', padding = 'default', className, ...rest },
    ref,
  ) => (
    <div
      ref={ref}
      className={clsx(
        styles.root,
        variantMap[variant],
        padding === 'compact' && styles.paddingCompact,
        className,
      )}
      {...rest}
    />
  ),
);

Card.displayName = 'Card';
