import { forwardRef, useEffect, useRef, useState } from 'react';
import type {
  HTMLAttributes,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from 'react';
import clsx from 'clsx';
import styles from './ArtifactDrawer.module.css';

export interface ArtifactDrawerProps extends HTMLAttributes<HTMLDivElement> {
  expanded?: boolean;
  onToggle?: () => void;
  resizable?: boolean;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
}

export interface ArtifactHeadProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  tabs?: ReactNode;
}

export interface ArtifactBodyProps extends HTMLAttributes<HTMLDivElement> {}

export interface ArtifactFootProps extends HTMLAttributes<HTMLDivElement> {}

const DRAWER_WIDTH_STORAGE_KEY = 'gc-shell-artifact-width';
const DEFAULT_DRAWER_WIDTH = 336;
const MIN_DRAWER_WIDTH = 280;
const MAX_DRAWER_WIDTH = 720;

const ArtifactDrawerRoot = forwardRef<HTMLDivElement, ArtifactDrawerProps>(
  (
    {
      expanded,
      onToggle,
      resizable = true,
      defaultWidth = DEFAULT_DRAWER_WIDTH,
      minWidth = MIN_DRAWER_WIDTH,
      maxWidth = MAX_DRAWER_WIDTH,
      className,
      children,
      style,
      ...rest
    },
    ref,
  ) => {
    const [width, setWidth] = useState(defaultWidth);
    const [dragging, setDragging] = useState(false);
    const dragStateRef = useRef<{ startX: number; startWidth: number } | null>(
      null,
    );

    useEffect(() => {
      if (typeof window === 'undefined') return;

      const savedWidth = window.localStorage.getItem(DRAWER_WIDTH_STORAGE_KEY);
      if (!savedWidth) return;

      const parsedWidth = Number(savedWidth);
      if (!Number.isFinite(parsedWidth)) return;

      setWidth(Math.min(maxWidth, Math.max(minWidth, parsedWidth)));
    }, [maxWidth, minWidth]);

    useEffect(() => {
      if (typeof window === 'undefined') return;
      window.localStorage.setItem(DRAWER_WIDTH_STORAGE_KEY, String(width));
    }, [width]);

    useEffect(() => {
      if (!dragging) return undefined;

      const previousCursor = document.body.style.cursor;
      const previousUserSelect = document.body.style.userSelect;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      const handlePointerMove = (event: PointerEvent) => {
        const dragState = dragStateRef.current;
        if (!dragState) return;

        const nextWidth =
          dragState.startWidth - (event.clientX - dragState.startX);
        setWidth(Math.min(maxWidth, Math.max(minWidth, nextWidth)));
      };

      const handlePointerUp = () => {
        dragStateRef.current = null;
        setDragging(false);
      };

      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);

      return () => {
        document.body.style.cursor = previousCursor;
        document.body.style.userSelect = previousUserSelect;
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
      };
    }, [dragging, maxWidth, minWidth]);

    const handleResizeStart = (event: ReactPointerEvent<HTMLDivElement>) => {
      dragStateRef.current = {
        startX: event.clientX,
        startWidth: width,
      };
      setDragging(true);
      event.preventDefault();
    };

    return (
      <div
        ref={ref}
        className={clsx(
          styles.root,
          expanded ? styles.rootExpanded : styles.rootCollapsed,
          dragging && styles.rootDragging,
          className,
        )}
        style={{
          ...style,
          width: expanded ? `${width}px` : undefined,
        }}
        {...rest}
      >
        {!expanded ? (
          <>
            <button
              type="button"
              className={styles.chevron}
              onClick={onToggle}
              aria-label="Expand artifact drawer"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M6 4L10 8L6 12"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <span className={styles.labelV}>Artifact</span>
          </>
        ) : (
          <>
            {resizable ? (
              <div
                className={styles.resizeHandle}
                onPointerDown={handleResizeStart}
                onDoubleClick={() => setWidth(defaultWidth)}
                role="separator"
                aria-orientation="vertical"
                aria-label="Resize artifact drawer"
                title="Drag to resize. Double-click to reset."
              />
            ) : null}
            <button
              type="button"
              className={styles.chevron}
              onClick={onToggle}
              aria-label="Collapse artifact drawer"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M10 4L6 8L10 12"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            {children}
          </>
        )}
      </div>
    );
  },
);
ArtifactDrawerRoot.displayName = 'ArtifactDrawer';

const ArtifactHead = forwardRef<HTMLDivElement, ArtifactHeadProps>(
  ({ title, tabs, className, ...rest }, ref) => (
    <div ref={ref} className={clsx(styles.head, className)} {...rest}>
      {title && <span className={styles.title}>{title}</span>}
      {tabs}
    </div>
  ),
);
ArtifactHead.displayName = 'ArtifactDrawer.Head';

const ArtifactBody = forwardRef<HTMLDivElement, ArtifactBodyProps>(
  ({ className, ...rest }, ref) => (
    <div ref={ref} className={clsx(styles.body, className)} {...rest} />
  ),
);
ArtifactBody.displayName = 'ArtifactDrawer.Body';

const ArtifactFoot = forwardRef<HTMLDivElement, ArtifactFootProps>(
  ({ className, ...rest }, ref) => (
    <div ref={ref} className={clsx(styles.foot, className)} {...rest} />
  ),
);
ArtifactFoot.displayName = 'ArtifactDrawer.Foot';

export const ArtifactDrawer = Object.assign(ArtifactDrawerRoot, {
  Head: ArtifactHead,
  Body: ArtifactBody,
  Foot: ArtifactFoot,
});
