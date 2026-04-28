import type { ReactNode } from 'react';

export type ArtifactTabId = 'thesis' | 'spikepack' | 'snapshot' | 'reference';

export interface ArtifactTabItemBase {
  id: string;
  title: string;
  summary: ReactNode;
  meta?: string[];
}

export interface ArtifactThesisItem extends ArtifactTabItemBase {
  status?: string;
  source?: string;
}

export interface ArtifactSpikePackItem extends ArtifactTabItemBase {
  frozenAt?: string;
  sessionId?: string;
}

export interface ArtifactSnapshotItem extends ArtifactTabItemBase {
  capturedAt?: string;
  scope?: string;
}

export interface ArtifactReferenceItem extends ArtifactTabItemBase {
  href?: string;
  source?: string;
}

export interface ArtifactTabItemMap {
  thesis: ArtifactThesisItem;
  spikepack: ArtifactSpikePackItem;
  snapshot: ArtifactSnapshotItem;
  reference: ArtifactReferenceItem;
}

export type ArtifactTabsInput = Partial<{
  [K in ArtifactTabId]: readonly ArtifactTabItemMap[K][];
}>;

export interface ArtifactTabsData {
  thesis: ArtifactThesisItem[];
  spikepack: ArtifactSpikePackItem[];
  snapshot: ArtifactSnapshotItem[];
  reference: ArtifactReferenceItem[];
}

export interface ArtifactTabMeta {
  id: ArtifactTabId;
  label: string;
  hint: string;
  emptyTitle: string;
  emptyBody: string;
}
