import { useEffect, useCallback } from 'react';
import type { HTMLAttributes } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import styles from './Toast.module.css';

export interface ToastProps extends HTMLAttributes<HTMLDivElement> {
  open: boolean;
  onClose: () => void;
  variant?: 'default' | 'success' | 'error';
  duration?: number;
}

export const Toast = ({
  open,
  onClose,
  variant = 'default',
  duration = 4000,
  children,
  className,
  ...rest
}: ToastProps) => {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener('keydown', handleKeyDown);
    const timer = setTimeout(onClose, duration);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timer);
    };
  }, [open, duration, onClose, handleKeyDown]);

  if (!open) return null;

  return createPortal(
    <div
      role="alert"
      className={clsx(
        styles.root,
        variant === 'success' && styles.variantSuccess,
        variant === 'error' && styles.variantError,
        className,
      )}
      {...rest}
    >
      <span className={styles.content}>{children}</span>
      <button
        type="button"
        className={styles.closeBtn}
        onClick={onClose}
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>,
    document.body,
  );
};

Toast.displayName = 'Toast';
