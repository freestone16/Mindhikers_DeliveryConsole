import { forwardRef } from 'react';
import type { TextareaHTMLAttributes } from 'react';
import clsx from 'clsx';
import styles from './Textarea.module.css';

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ error, disabled, className, ...rest }, ref) => (
    <textarea
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

Textarea.displayName = 'Textarea';
