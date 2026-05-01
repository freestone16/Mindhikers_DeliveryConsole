import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import clsx from 'clsx';
import styles from './Button.module.css';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'ghost' | 'ochre';
  size?: 'default' | 'sm';
}

const variantMap = {
  default: styles.variantDefault,
  primary: styles.variantPrimary,
  ghost: styles.variantGhost,
  ochre: styles.variantOchre,
} as const;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'default',
      size = 'default',
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
      className={clsx(
        styles.root,
        variantMap[variant],
        size === 'sm' && styles.sizeSm,
        disabled && styles.rootDisabled,
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  ),
);

Button.displayName = 'Button';
