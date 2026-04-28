import { forwardRef } from 'react';
import type { HTMLAttributes } from 'react';
import clsx from 'clsx';
import styles from './Panel.module.css';

export interface PanelProps extends HTMLAttributes<HTMLDivElement> {}

export interface PanelSectionProps extends HTMLAttributes<HTMLDivElement> {}

const PanelRoot = forwardRef<HTMLDivElement, PanelProps>(
  ({ className, ...rest }, ref) => (
    <div ref={ref} className={clsx(styles.root, className)} {...rest} />
  ),
);
PanelRoot.displayName = 'Panel';

const PanelHeader = forwardRef<HTMLDivElement, PanelSectionProps>(
  ({ className, ...rest }, ref) => (
    <div
      ref={ref}
      className={clsx(styles.header, className)}
      {...rest}
    />
  ),
);
PanelHeader.displayName = 'Panel.Header';

const PanelBody = forwardRef<HTMLDivElement, PanelSectionProps>(
  ({ className, ...rest }, ref) => (
    <div ref={ref} className={clsx(styles.body, className)} {...rest} />
  ),
);
PanelBody.displayName = 'Panel.Body';

const PanelFooter = forwardRef<HTMLDivElement, PanelSectionProps>(
  ({ className, ...rest }, ref) => (
    <div
      ref={ref}
      className={clsx(styles.footer, className)}
      {...rest}
    />
  ),
);
PanelFooter.displayName = 'Panel.Footer';

export const Panel = Object.assign(PanelRoot, {
  Header: PanelHeader,
  Body: PanelBody,
  Footer: PanelFooter,
});
