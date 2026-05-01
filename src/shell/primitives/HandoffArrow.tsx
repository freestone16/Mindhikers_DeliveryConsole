import { forwardRef } from 'react';
import type { HTMLAttributes } from 'react';
import clsx from 'clsx';
import styles from './HandoffArrow.module.css';

export interface HandoffArrowProps extends HTMLAttributes<HTMLDivElement> {}

export const HandoffArrow = forwardRef<HTMLDivElement, HandoffArrowProps>(
  ({ className, ...rest }, ref) => (
    <div ref={ref} className={clsx(styles.root, className)} {...rest}>
      <div className={styles.line} />
      <svg
        className={styles.arrow}
        viewBox="0 0 48 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M24 4 L40 12 L24 20"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  ),
);

HandoffArrow.displayName = 'HandoffArrow';
