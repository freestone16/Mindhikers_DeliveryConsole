// P1.T2 · Avatar — circular user/persona indicator
import { forwardRef } from 'react';
import type { HTMLAttributes } from 'react';
import clsx from 'clsx';
import styles from './Avatar.module.css';

export interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  initial: string;
  variant?: 'default' | 'user';
  size?: 'default' | 'lg';
}

export const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  ({ initial, variant = 'default', size = 'default', className, ...rest }, ref) => (
    <div
      ref={ref}
      className={clsx(
        styles.root,
        size === 'lg' ? styles.sizeLg : styles.sizeDefault,
        variant === 'user' && styles.variantUser,
        className,
      )}
      aria-label={rest['aria-label'] ?? `Avatar ${initial}`}
      {...rest}
    >
      {initial.charAt(0).toUpperCase()}
    </div>
  ),
);

Avatar.displayName = 'Avatar';
