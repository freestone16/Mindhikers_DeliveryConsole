import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import clsx from 'clsx';
import styles from './HandoffButton.module.css';

export interface HandoffButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'confirm' | 'cancel';
}

const variantMap = {
  confirm: styles.variantConfirm,
  cancel: styles.variantCancel,
} as const;

export const HandoffButton = forwardRef<HTMLButtonElement, HandoffButtonProps>(
  ({ variant = 'confirm', disabled, className, children, ...rest }, ref) => (
    <button
      ref={ref}
      disabled={disabled}
      className={clsx(
        styles.root,
        variantMap[variant],
        disabled && styles.rootDisabled,
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  ),
);

HandoffButton.displayName = 'HandoffButton';
