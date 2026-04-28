import { useId, useRef, useState } from 'react';
import type { HTMLAttributes, KeyboardEvent } from 'react';
import clsx from 'clsx';
import type {
  ArtifactTabId,
  ArtifactTabMeta,
  ArtifactTabItemMap,
  ArtifactTabsData,
  ArtifactTabsInput,
} from './types';
import styles from './ArtifactTabs.module.css';

const ARTIFACT_TAB_META: readonly ArtifactTabMeta[] = [
  {
    id: 'thesis',
    label: 'Thesis',
    hint: '收敛命题',
    emptyTitle: '暂无 Thesis',
    emptyBody: '这里会展示收敛后的主命题、结论和当前状态。',
  },
  {
    id: 'spikepack',
    label: 'SpikePack',
    hint: '冻结试验包',
    emptyTitle: '暂无 SpikePack',
    emptyBody: '这里会展示已冻结的试验包、切片记录和会话来源。',
  },
  {
    id: 'snapshot',
    label: 'Snapshot',
    hint: '会话快照',
    emptyTitle: '暂无 Snapshot',
    emptyBody: '这里会展示当前会话的归档快照和可回溯片段。',
  },
  {
    id: 'reference',
    label: 'Reference',
    hint: '外部资料',
    emptyTitle: '暂无 Reference',
    emptyBody: '这里会展示引用资料、外链和项目上下文参考。',
  },
] as const;

export function normalizeArtifactTabsData(
  data?: ArtifactTabsInput,
): ArtifactTabsData {
  return {
    thesis: [...(data?.thesis ?? [])],
    spikepack: [...(data?.spikepack ?? [])],
    snapshot: [...(data?.snapshot ?? [])],
    reference: [...(data?.reference ?? [])],
  };
}

export interface ArtifactTabsProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  data?: ArtifactTabsInput;
  activeTab?: ArtifactTabId;
  defaultActiveTab?: ArtifactTabId;
  onActiveTabChange?: (tab: ArtifactTabId) => void;
}

export function ArtifactTabs({
  data,
  activeTab,
  defaultActiveTab = 'thesis',
  onActiveTabChange,
  className,
  ...rest
}: ArtifactTabsProps) {
  const [internalTab, setInternalTab] = useState<ArtifactTabId>(defaultActiveTab);
  const currentTab = activeTab ?? internalTab;
  const tabPrefix = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const tabs = normalizeArtifactTabsData(data);
  const activeMeta = ARTIFACT_TAB_META.find((item) => item.id === currentTab) ?? ARTIFACT_TAB_META[0];
  const currentItems = tabs[currentTab];

  const setTab = (tab: ArtifactTabId) => {
    if (activeTab === undefined) {
      setInternalTab(tab);
    }
    onActiveTabChange?.(tab);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (!keys.includes(event.key)) return;

    event.preventDefault();

    let nextIndex = index;
    if (event.key === 'ArrowLeft') {
      nextIndex = (index - 1 + ARTIFACT_TAB_META.length) % ARTIFACT_TAB_META.length;
    } else if (event.key === 'ArrowRight') {
      nextIndex = (index + 1) % ARTIFACT_TAB_META.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = ARTIFACT_TAB_META.length - 1;
    }

    const nextTab = ARTIFACT_TAB_META[nextIndex].id;
    setTab(nextTab);
    tabRefs.current[nextIndex]?.focus();
  };

  return (
    <div className={clsx(styles.root, className)} {...rest}>
      <div className={styles.tabList} role="tablist" aria-label="Artifact tabs">
        {ARTIFACT_TAB_META.map((meta, index) => {
          const active = currentTab === meta.id;
          const count = tabs[meta.id].length;

          return (
            <button
              key={meta.id}
              ref={(node) => {
                tabRefs.current[index] = node;
              }}
              id={`${tabPrefix}-${meta.id}-tab`}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={`${tabPrefix}-${meta.id}-panel`}
              tabIndex={active ? 0 : -1}
              className={clsx(styles.tabButton, active && styles.tabButtonActive)}
              onClick={() => setTab(meta.id)}
              onKeyDown={(event) => handleKeyDown(event, index)}
            >
              <span className={styles.tabLabel}>{meta.label}</span>
              <span className={styles.tabHint}>{meta.hint}</span>
              <span className={styles.tabCount}>{count}</span>
            </button>
          );
        })}
      </div>

      <div
        id={`${tabPrefix}-${currentTab}-panel`}
        className={styles.panel}
        role="tabpanel"
        aria-labelledby={`${tabPrefix}-${currentTab}-tab`}
      >
        <div className={styles.panelHead}>
          <div>
            <div className={styles.panelTitle}>{activeMeta.label}</div>
            <div className={styles.panelHint}>{activeMeta.hint}</div>
          </div>
          <div className={styles.panelCount}>{currentItems.length} items</div>
        </div>

        {currentItems.length > 0 ? (
          <div className={styles.cardList}>
            {currentItems.map((item) => (
              <ArtifactCard
                key={item.id}
                tabId={currentTab}
                item={item as ArtifactTabItemMap[typeof currentTab]}
              />
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <div className={styles.emptyTitle}>{activeMeta.emptyTitle}</div>
            <div className={styles.emptyBody}>{activeMeta.emptyBody}</div>
          </div>
        )}
      </div>
    </div>
  );
}

function ArtifactCard({
  tabId,
  item,
}: {
  tabId: ArtifactTabId;
  item: ArtifactTabItemMap[ArtifactTabId];
}) {
  const details = (() => {
    switch (tabId) {
      case 'thesis':
        return (
          <>
            {'status' in item && item.status ? (
              <span className={styles.cardNote}>Status: {item.status}</span>
            ) : null}
            {'source' in item && item.source ? (
              <span className={styles.cardNote}>{item.source}</span>
            ) : null}
          </>
        );
      case 'spikepack':
        return (
          <>
            {'frozenAt' in item && item.frozenAt ? (
              <span className={styles.cardNote}>Frozen: {item.frozenAt}</span>
            ) : null}
            {'sessionId' in item && item.sessionId ? (
              <span className={styles.cardNote}>Session: {item.sessionId}</span>
            ) : null}
          </>
        );
      case 'snapshot':
        return (
          <>
            {'capturedAt' in item && item.capturedAt ? (
              <span className={styles.cardNote}>Captured: {item.capturedAt}</span>
            ) : null}
            {'scope' in item && item.scope ? (
              <span className={styles.cardNote}>{item.scope}</span>
            ) : null}
          </>
        );
      case 'reference':
        return (
          <>
            {'source' in item && item.source ? (
              <span className={styles.cardNote}>{item.source}</span>
            ) : null}
            {'href' in item && item.href ? (
              <a
                className={styles.cardLink}
                href={item.href}
                target="_blank"
                rel="noreferrer"
              >
                Open
              </a>
            ) : null}
          </>
        );
    }
  })();

  return (
    <article className={styles.card}>
      <div className={styles.cardHead}>
        <h4 className={styles.cardTitle}>{item.title}</h4>
      </div>

      <div className={styles.cardBody}>{item.summary}</div>

      {item.meta && item.meta.length > 0 ? (
        <div className={styles.metaRow}>
          {item.meta.map((meta) => (
            <span key={meta} className={styles.metaChip}>
              {meta}
            </span>
          ))}
        </div>
      ) : null}

      <div className={styles.cardFoot}>{details}</div>
    </article>
  );
}

ArtifactCard.displayName = 'ArtifactCard';
