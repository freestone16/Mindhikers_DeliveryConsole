import { forwardRef } from 'react';
import type { HTMLAttributes } from 'react';
import clsx from 'clsx';
import styles from './HandoffChecklist.module.css';

export interface CheckItem {
  label: string;
  meta?: string;
  state: 'done' | 'pending';
}

export interface HandoffChecklistProps extends HTMLAttributes<HTMLDivElement> {
  items: CheckItem[];
}

const CheckSvg = () => (
  <svg viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M3 7.5L5.5 10L11 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CircleSvg = () => (
  <svg viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

export const HandoffChecklist = forwardRef<HTMLDivElement, HandoffChecklistProps>(
  ({ items, className, ...rest }, ref) => (
    <div ref={ref} className={clsx(styles.root, className)} {...rest}>
      {items.map((item, i) => (
        <div
          key={i}
          className={styles.check}
          data-state={item.state}
        >
          {item.state === 'done' ? <CheckSvg /> : <CircleSvg />}
          <span className={styles.label}>{item.label}</span>
          {item.meta && <span className={styles.meta}>{item.meta}</span>}
        </div>
      ))}
    </div>
  ),
);

HandoffChecklist.displayName = 'HandoffChecklist';
