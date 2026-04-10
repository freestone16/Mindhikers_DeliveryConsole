import type { ReactNode } from 'react';

export const AuthBoundary = ({ children }: { children: ReactNode }) => {
  return <>{children}</>;
};
