import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import clsx from 'clsx';
import styles from './IconButton.module.css';

export interface IconButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'ghost';
  size?: 'default' | 'sm';
  label: string;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      variant = 'default',
      size = 'default',
      label,
      disabled,
      className,
      children,
      ...rest
    },
    ref,
  ) => (
    <button
      ref={ref}
      disabled={disabled}
      aria-label={label}
      className={clsx(
        styles.root,
        variant === 'ghost' ? styles.variantGhost : styles.variantDefault,
        size === 'sm' ? styles.sizeSm : styles.sizeDefault,
        disabled && styles.rootDisabled,
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  ),
);

IconButton.displayName = 'IconButton';
