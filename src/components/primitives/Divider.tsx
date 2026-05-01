// P1.T2 · Divider — horizontal hairline separator
import clsx from 'clsx';
import styles from './Divider.module.css';

export interface DividerProps {
  vertical?: boolean;
  className?: string;
}

export const Divider = ({ vertical, className }: DividerProps) => (
  <hr
    className={clsx(styles.root, vertical && styles.rootVertical, className)}
    aria-orientation={vertical ? 'vertical' : 'horizontal'}
  />
);

Divider.displayName = 'Divider';
