import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import clsx from 'clsx';
import styles from './Input.module.css';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ error, disabled, className, ...rest }, ref) => (
    <input
      ref={ref}
      disabled={disabled}
      className={clsx(
        styles.root,
        error && styles.rootError,
        disabled && styles.rootDisabled,
        className,
      )}
      {...rest}
    />
  ),
);

Input.displayName = 'Input';
