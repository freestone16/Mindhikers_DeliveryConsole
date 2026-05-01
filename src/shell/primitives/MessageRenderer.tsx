import { forwardRef } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';
import styles from './MessageRenderer.module.css';

export interface MessageRendererProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  avatar: ReactNode;
  name: string;
  role?: string;
  time?: string;
  children: ReactNode;
  spike?: boolean;
  spikeTag?: string;
  variant?: 'default' | 'user';
}

export const MessageRenderer = forwardRef<
  HTMLDivElement,
  MessageRendererProps
>(
  (
    {
      avatar,
      name,
      role,
      time,
      children,
      spike,
      spikeTag,
      variant,
      className,
      ...rest
    },
    ref,
  ) => (
    <div
      ref={ref}
      className={clsx(
        styles.root,
        variant === 'user' && styles.rootUser,
        spike && styles.rootSpike,
        className,
      )}
      {...rest}
    >
      <div
        className={clsx(
          styles.avatar,
          variant === 'user' && styles.avatarUser,
        )}
      >
        {avatar}
      </div>
      <div className={styles.body}>
        <div className={styles.head}>
          <span className={styles.name}>{name}</span>
          {role && <span className={styles.role}>{role}</span>}
          {time && <span className={styles.time}>{time}</span>}
        </div>
        <div className={styles.content}>{children}</div>
        {spike && spikeTag && (
          <span className={styles.spikeTag}>
            <span className={styles.spikeDot} />
            {spikeTag}
          </span>
        )}
      </div>
    </div>
  ),
);

MessageRenderer.displayName = 'MessageRenderer';
