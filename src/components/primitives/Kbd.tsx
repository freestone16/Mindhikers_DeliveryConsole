// P1.T2 · Kbd — keyboard shortcut indicator
import type { HTMLAttributes } from 'react';
import clsx from 'clsx';
import styles from './Kbd.module.css';

export interface KbdProps extends HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
}

export const Kbd = ({ children, className, ...rest }: KbdProps) => (
  <kbd className={clsx(styles.root, className)} {...rest}>
    {children}
  </kbd>
);

Kbd.displayName = 'Kbd';
