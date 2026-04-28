import type { HTMLAttributes } from 'react';
import clsx from 'clsx';
import styles from './Skeleton.module.css';

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circle' | 'rect';
  width?: string | number;
  height?: string | number;
}

export const Skeleton = ({
  variant = 'text',
  width,
  height,
  className,
  style,
  ...rest
}: SkeletonProps) => (
  <div
    className={clsx(
      styles.root,
      variant === 'text' && styles.variantText,
      variant === 'circle' && styles.variantCircle,
      variant === 'rect' && styles.variantRect,
      className,
    )}
    style={{
      width: width ?? (variant === 'text' ? '100%' : undefined),
      height: height ?? (variant === 'text' ? '14px' : undefined),
      ...style,
    }}
    aria-hidden
    {...rest}
  />
);

Skeleton.displayName = 'Skeleton';
