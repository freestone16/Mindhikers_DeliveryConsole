import { forwardRef } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';
import styles from './Rail.module.css';

export interface RailProps extends HTMLAttributes<HTMLDivElement> {}

export interface RailBrandProps extends HTMLAttributes<HTMLDivElement> {
  mark?: ReactNode;
  name?: string;
  suffix?: string;
}

export interface RailSectionProps extends HTMLAttributes<HTMLDivElement> {}

export interface RailEyebrowProps extends HTMLAttributes<HTMLDivElement> {
  action?: ReactNode;
}

export interface RailUserProps extends HTMLAttributes<HTMLDivElement> {
  avatar?: ReactNode;
  name?: string;
  subtitle?: string;
  action?: ReactNode;
}

const RailRoot = forwardRef<HTMLDivElement, RailProps>(
  ({ className, children, ...rest }, ref) => (
    <div ref={ref} className={clsx(styles.root, className)} {...rest}>
      {children}
    </div>
  ),
);
RailRoot.displayName = 'Rail';

const RailBrand = forwardRef<HTMLDivElement, RailBrandProps>(
  ({ mark, name, suffix, className, children, ...rest }, ref) => (
    <div ref={ref} className={clsx(styles.brand, className)} {...rest}>
      {mark && <span className={styles.brandMark}>{mark}</span>}
      {name && <span className={styles.brandName}>{name}</span>}
      {suffix && <span className={styles.brandSuffix}>{suffix}</span>}
      {children}
    </div>
  ),
);
RailBrand.displayName = 'Rail.Brand';

const RailSection = forwardRef<HTMLDivElement, RailSectionProps>(
  ({ className, ...rest }, ref) => (
    <div ref={ref} className={clsx(styles.section, className)} {...rest} />
  ),
);
RailSection.displayName = 'Rail.Section';

const RailEyebrow = forwardRef<HTMLDivElement, RailEyebrowProps>(
  ({ action, className, children, ...rest }, ref) => (
    <div ref={ref} className={clsx(styles.eyebrow, className)} {...rest}>
      <span>{children}</span>
      {action}
    </div>
  ),
);
RailEyebrow.displayName = 'Rail.Eyebrow';

const RailUser = forwardRef<HTMLDivElement, RailUserProps>(
  ({ avatar, name, subtitle, action, className, ...rest }, ref) => (
    <div ref={ref} className={clsx(styles.user, className)} {...rest}>
      {avatar && <span className={styles.userAvatar}>{avatar}</span>}
      <div className={styles.userInfo}>
        {name && <span className={styles.userName}>{name}</span>}
        {subtitle && <span className={styles.userSub}>{subtitle}</span>}
      </div>
      {action && <span className={styles.userAction}>{action}</span>}
    </div>
  ),
);
RailUser.displayName = 'Rail.User';

export const Rail = Object.assign(RailRoot, {
  Brand: RailBrand,
  Section: RailSection,
  Eyebrow: RailEyebrow,
  User: RailUser,
});
