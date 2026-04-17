import { useState, useCallback, useEffect, useRef } from 'react';
import type { ReactElement } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import styles from './Tooltip.module.css';

export interface TooltipProps {
  content: React.ReactNode;
  side?: 'top' | 'bottom';
  children: ReactElement;
  delay?: number;
}

export const Tooltip = ({
  content,
  side = 'top',
  children,
  delay = 200,
}: TooltipProps) => {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const show = useCallback(() => {
    timerRef.current = setTimeout(() => setVisible(true), delay);
  }, [delay]);

  const hide = useCallback(() => {
    clearTimeout(timerRef.current);
    setVisible(false);
  }, []);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return (
    <span
      className={styles.wrapper}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {visible &&
        createPortal(
          <span
            role="tooltip"
            className={clsx(
              styles.root,
              visible && styles.rootVisible,
              side === 'top' ? styles.rootTop : styles.rootBottom,
            )}
          >
            {content}
            <span className={styles.arrow} aria-hidden />
          </span>,
          document.body,
        )}
    </span>
  );
};

Tooltip.displayName = 'Tooltip';
