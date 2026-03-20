import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  appendDistributionHistory,
  getDistributionHistoryFile,
  getDistributionQueueFile,
  loadDistributionHistory,
  listDistributionAssets,
  savePublishPackageSnapshot,
  loadDistributionQueue,
  saveDistributionQueue,
} from '../../../server/distribution-store';

const originalProjectsBase = process.env.PROJECTS_BASE;

afterEach(() => {
  if (originalProjectsBase === undefined) {
    delete process.env.PROJECTS_BASE;
  } else {
    process.env.PROJECTS_BASE = originalProjectsBase;
  }
});

describe('distribution-store', () => {
  it('stores queue files inside the project 06_Distribution directory', () => {
    process.env.PROJECTS_BASE = '/tmp/mhsdc-projects';

    expect(getDistributionQueueFile('alpha')).toBe(
      path.join('/tmp/mhsdc-projects', 'alpha', '06_Distribution', 'distribution_queue.json')
    );
    expect(getDistributionHistoryFile('alpha')).toBe(
      path.join('/tmp/mhsdc-projects', 'alpha', '06_Distribution', 'distribution_history.json')
    );
  });

  it('migrates legacy global queue tasks into the project-local queue file', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dt-store-'));
    process.env.PROJECTS_BASE = tempRoot;

    fs.mkdirSync(path.join(tempRoot, 'alpha'), { recursive: true });
    fs.writeFileSync(
      path.join(tempRoot, '_distribution_queue.json'),
      JSON.stringify(
        [
          {
            taskId: 'dist_alpha',
            projectId: 'alpha',
            platforms: ['youtube'],
            assets: { mediaUrl: '05_Shorts_Output/a.mp4', textDraft: '', title: 'A', tags: [] },
            status: 'pending',
            createdAt: '2026-03-20T00:00:00.000Z',
          },
          {
            taskId: 'dist_beta',
            projectId: 'beta',
            platforms: ['x'],
            assets: { mediaUrl: '05_Shorts_Output/b.mp4', textDraft: '', title: 'B', tags: [] },
            status: 'pending',
            createdAt: '2026-03-20T00:00:00.000Z',
          },
        ],
        null,
        2
      )
    );

    const queue = loadDistributionQueue('alpha');

    expect(queue).toHaveLength(1);
    expect(queue[0].taskId).toBe('dist_alpha');
    expect(fs.existsSync(getDistributionQueueFile('alpha'))).toBe(true);
  });

  it('lists project videos and text assets from project-local folders', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dt-assets-'));
    process.env.PROJECTS_BASE = tempRoot;

    const projectRoot = path.join(tempRoot, 'gamma');
    fs.mkdirSync(path.join(projectRoot, '05_Shorts_Output'), { recursive: true });
    fs.mkdirSync(path.join(projectRoot, '05_Marketing'), { recursive: true });
    fs.mkdirSync(path.join(projectRoot, '02_Script'), { recursive: true });

    fs.writeFileSync(path.join(projectRoot, '05_Shorts_Output', 'demo_9-16.mp4'), '');
    fs.writeFileSync(path.join(projectRoot, '05_Marketing', 'marketing_plan.json'), '{}');
    fs.writeFileSync(path.join(projectRoot, '02_Script', 'script.md'), '# title');

    const assets = listDistributionAssets('gamma');

    expect(assets.videos).toEqual([
      {
        name: 'demo_9-16.mp4',
        path: '05_Shorts_Output/demo_9-16.mp4',
        type: '9:16',
      },
    ]);
    expect(assets.marketingFiles).toEqual(
      expect.arrayContaining([
        { name: 'marketing_plan.json', path: '05_Marketing/marketing_plan.json' },
        { name: 'script.md', path: '02_Script/script.md' },
      ])
    );
  });

  it('persists updated queue content into the project-local queue file', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dt-save-'));
    process.env.PROJECTS_BASE = tempRoot;

    saveDistributionQueue('delta', [
      {
        taskId: 'dist_saved',
        projectId: 'delta',
        platforms: ['wechat_mp'],
        assets: { mediaUrl: '02_Script/story.md', textDraft: 'body', title: 'Story', tags: ['a'] },
        status: 'scheduled',
        createdAt: '2026-03-20T00:00:00.000Z',
      },
    ]);

    const savedQueue = JSON.parse(fs.readFileSync(getDistributionQueueFile('delta'), 'utf-8'));
    expect(savedQueue[0].taskId).toBe('dist_saved');
  });

  it('appends distribution history entries and writes publish package snapshots', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dt-history-'));
    process.env.PROJECTS_BASE = tempRoot;

    appendDistributionHistory('epsilon', [
      {
        historyId: 'hist_1',
        taskId: 'dist_1',
        projectId: 'epsilon',
        platform: 'youtube',
        title: 'Demo',
        mediaUrl: '05_Shorts_Output/demo.mp4',
        status: 'success',
        createdAt: '2026-03-20T00:00:00.000Z',
        completedAt: '2026-03-20T00:01:00.000Z',
        remoteId: 'abc123',
        url: 'https://youtube.com/watch?v=abc123',
      },
    ]);

    const history = loadDistributionHistory('epsilon');
    expect(history).toHaveLength(1);
    expect(history[0].remoteId).toBe('abc123');

    const snapshotPath = savePublishPackageSnapshot('epsilon', {
      taskId: 'dist_1',
      projectId: 'epsilon',
      platforms: ['youtube'],
      assets: { mediaUrl: '05_Shorts_Output/demo.mp4', textDraft: 'body', title: 'Demo', tags: [] },
      status: 'pending',
      createdAt: '2026-03-20T00:00:00.000Z',
    });

    expect(fs.existsSync(snapshotPath)).toBe(true);
    const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf-8'));
    expect(snapshot.task.taskId).toBe('dist_1');
  });
});
