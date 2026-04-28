import type { ModuleManifest } from '../types';

export const crucibleManifest: ModuleManifest = {
  id: 'crucible',
  label: '炼制',
  icon: <span aria-hidden="true">坩</span>,
  path: '/m/crucible',
  order: 10,
  description: '黄金坩埚',
  sessionLabel: 'Conversation',
  sessionSource: {
    activeSessionId: 'crucible-c-0831-03',
    items: [
      {
        id: 'crucible-c-0831-01',
        label: 'C-0831-01 立题草案',
        meta: '更新于 09:12',
        status: 'draft',
      },
      {
        id: 'crucible-c-0831-02',
        label: 'C-0831-02 证据收束',
        meta: '更新于 10:28',
        status: 'draft',
      },
      {
        id: 'crucible-c-0831-03',
        label: 'C-0831-03 终局合成',
        meta: '更新于 11:06',
        status: 'active',
      },
    ],
  },
};
