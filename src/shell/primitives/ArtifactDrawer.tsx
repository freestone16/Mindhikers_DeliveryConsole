import { forwardRef } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';
import styles from './ArtifactDrawer.module.css';

export interface ArtifactDrawerProps extends HTMLAttributes<HTMLDivElement> {
  expanded?: boolean;
  onToggle?: () => void;
}

export interface ArtifactHeadProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  tabs?: ReactNode;
}

export interface ArtifactBodyProps extends HTMLAttributes<HTMLDivElement> {}

export interface ArtifactFootProps extends HTMLAttributes<HTMLDivElement> {}

const ArtifactDrawerRoot = forwardRef<HTMLDivElement, ArtifactDrawerProps>(
  ({ expanded, onToggle, className, children, ...rest }, ref) => (
    <div
      ref={ref}
      className={clsx(
        styles.root,
        expanded ? styles.rootExpanded : styles.rootCollapsed,
        className,
      )}
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
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <span className={styles.labelV}>Artifact</span>
        </>
      ) : (
        <>
          <button
            type="button"
            className={styles.chevron}
            onClick={onToggle}
            aria-label="Collapse artifact drawer"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M10 4L6 8L10 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {children}
        </>
      )}
    </div>
  ),
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
