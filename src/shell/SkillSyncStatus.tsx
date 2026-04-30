import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, ChevronUp, Loader2, XCircle } from 'lucide-react';
import { io } from 'socket.io-client';
import { runtimeConfig } from '../config/runtime';
import styles from './SkillSyncStatus.module.css';

type SkillSyncState = 'done' | 'warning' | 'error' | 'syncing';

interface SkillSyncPayload {
  status?: SkillSyncState;
  synced?: string[];
  expected?: string[];
  count?: number;
  sourceRoot?: string;
  targetRoot?: string;
  message?: string;
  timestamp?: string;
}

const statusLabels: Record<SkillSyncState, string> = {
  done: 'SkillSync synced',
  warning: 'SkillSync fallback',
  error: 'SkillSync failed',
  syncing: 'SkillSync checking',
};

export function SkillSyncStatus() {
  const [syncStatus, setSyncStatus] = useState<SkillSyncPayload | null>(null);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const socket = io(runtimeConfig.socketUrl);

    socket.on('skill-sync-status', (data: SkillSyncPayload) => {
      setSyncStatus(data);
    });

    return () => {
      socket.close();
    };
  }, []);

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const status = syncStatus?.status || 'syncing';
  const synced = useMemo(() => syncStatus?.synced || [], [syncStatus]);
  const expected = useMemo(
    () => syncStatus?.expected || ['Writer', 'ThesisWriter', 'Researcher', 'FactChecker', 'Socrates'],
    [syncStatus],
  );
  const count = syncStatus?.count ?? synced.length;
  const label = statusLabels[status];

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        type="button"
        className={styles.button}
        data-status={status}
        onClick={() => setOpen((current) => !current)}
        aria-label={label}
        title={label}
      >
        <span className={styles.icon} aria-hidden="true">
          {status === 'done' ? <CheckCircle2 size={15} /> : null}
          {status === 'warning' ? <AlertCircle size={15} /> : null}
          {status === 'error' ? <XCircle size={15} /> : null}
          {status === 'syncing' ? <Loader2 size={15} className={styles.spin} /> : null}
        </span>
        <span className={styles.text}>SkillSync</span>
        <span className={styles.count}>{count}/{expected.length}</span>
        <ChevronUp size={14} className={open ? styles.chevronOpen : styles.chevron} aria-hidden="true" />
      </button>

      {open ? (
        <div className={styles.popover}>
          <div className={styles.popoverHead}>
            <div>
              <div className={styles.eyebrow}>Runtime status</div>
              <div className={styles.title}>{label}</div>
            </div>
            <span className={styles.badge} data-status={status}>{status}</span>
          </div>

          {syncStatus?.message ? <div className={styles.message}>{syncStatus.message}</div> : null}

          <dl className={styles.meta}>
            <div>
              <dt>SSOT source</dt>
              <dd>{syncStatus?.sourceRoot || 'Waiting for sync status'}</dd>
            </div>
            <div>
              <dt>Target root</dt>
              <dd>{syncStatus?.targetRoot || 'Waiting for sync status'}</dd>
            </div>
          </dl>

          <div className={styles.skillBlock}>
            <div className={styles.eyebrow}>Synced skills</div>
            <div className={styles.skills}>
              {expected.map((skill) => {
                const isSynced = synced.includes(skill);
                return (
                  <span key={skill} className={styles.skill} data-synced={isSynced}>
                    {skill}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
