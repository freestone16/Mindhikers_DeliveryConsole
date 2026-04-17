import { forwardRef } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';
import styles from './Stage.module.css';

export interface StageProps extends HTMLAttributes<HTMLDivElement> {}

export interface StageTopbarProps extends HTMLAttributes<HTMLDivElement> {
  breadcrumbs?: ReactNode;
  meta?: ReactNode;
}

export interface StageBodyProps extends HTMLAttributes<HTMLDivElement> {}

export interface StageComposerProps extends HTMLAttributes<HTMLDivElement> {}

const StageRoot = forwardRef<HTMLDivElement, StageProps>(
  ({ className, ...rest }, ref) => (
    <div ref={ref} className={clsx(styles.root, className)} {...rest} />
  ),
);
StageRoot.displayName = 'Stage';

const StageTopbar = forwardRef<HTMLDivElement, StageTopbarProps>(
  ({ breadcrumbs, meta, className, children, ...rest }, ref) => (
    <div ref={ref} className={clsx(styles.topbar, className)} {...rest}>
      {breadcrumbs && <div className={styles.crumbs}>{breadcrumbs}</div>}
      {meta && <div className={styles.meta}>{meta}</div>}
      {children}
    </div>
  ),
);
StageTopbar.displayName = 'Stage.Topbar';

const StageBody = forwardRef<HTMLDivElement, StageBodyProps>(
  ({ className, ...rest }, ref) => (
    <div ref={ref} className={clsx(styles.body, className)} {...rest} />
  ),
);
StageBody.displayName = 'Stage.Body';

const StageComposer = forwardRef<HTMLDivElement, StageComposerProps>(
  ({ className, ...rest }, ref) => (
    <div ref={ref} className={clsx(styles.composer, className)} {...rest} />
  ),
);
StageComposer.displayName = 'Stage.Composer';

export const Stage = Object.assign(StageRoot, {
  Topbar: StageTopbar,
  Body: StageBody,
  Composer: StageComposer,
});
