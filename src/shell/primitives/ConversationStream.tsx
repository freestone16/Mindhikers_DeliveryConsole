import { forwardRef } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';
import styles from './ConversationStream.module.css';

export interface ConversationMessageAuthor {
  name: string;
  role?: string;
  avatar: ReactNode;
}

export interface ConversationMessageSpike {
  enabled: boolean;
  tag?: string;
}

export interface ConversationMessageNode {
  id: string;
  author: ConversationMessageAuthor;
  time?: string;
  body: ReactNode;
  spike?: ConversationMessageSpike;
  variant?: 'default' | 'user';
  meta?: Record<string, unknown>;
}

export type ConversationMessageRenderer = (
  message: ConversationMessageNode,
  index: number,
) => ReactNode;

export interface ConversationStreamProps
  extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
  messages?: ConversationMessageNode[];
  renderer?: ConversationMessageRenderer;
  loading?: boolean;
}

export const ConversationStream = forwardRef<
  HTMLDivElement,
  ConversationStreamProps
>(
  (
    { children, messages, renderer, loading, className, ...rest },
    ref,
  ) => {
    const hasMessageMode = Array.isArray(messages) && typeof renderer === 'function';

    return (
      <div
        ref={ref}
        className={clsx(styles.root, loading && styles.rootLoading, className)}
        {...rest}
      >
        {hasMessageMode
          ? messages.map((message, index) => renderer(message, index))
          : children}
      </div>
    );
  },
);

ConversationStream.displayName = 'ConversationStream';
