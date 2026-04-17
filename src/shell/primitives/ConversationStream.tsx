import { forwardRef } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';
import styles from './ConversationStream.module.css';

export interface ConversationStreamProps
  extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  loading?: boolean;
}

export const ConversationStream = forwardRef<
  HTMLDivElement,
  ConversationStreamProps
>(({ children, loading, className, ...rest }, ref) => (
  <div
    ref={ref}
    className={clsx(styles.root, loading && styles.rootLoading, className)}
    {...rest}
  >
    {children}
  </div>
));

ConversationStream.displayName = 'ConversationStream';