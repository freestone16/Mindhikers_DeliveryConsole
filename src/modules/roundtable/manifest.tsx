import type { ModuleManifest } from '../types';

export const roundtableManifest: ModuleManifest = {
  id: 'roundtable',
  label: '圆桌',
  icon: <span aria-hidden="true">辩</span>,
  path: '/m/roundtable',
  order: 20,
  description: '多 Persona 圆桌辩论',
  sessionLabel: 'Session',
  sessionSource: {
    activeSessionId: 'roundtable-r-0819-02',
    items: [
      {
        id: 'roundtable-r-0819-01',
        label: 'R-0819-01 开场设问',
        meta: '更新于 08:41',
        status: 'draft',
      },
      {
        id: 'roundtable-r-0819-02',
        label: 'R-0819-02 角色交锋',
        meta: '更新于 09:55',
        status: 'active',
      },
      {
        id: 'roundtable-r-0819-03',
        label: 'R-0819-03 结论归拢',
        meta: '更新于 10:17',
        status: 'archived',
      },
    ],
  },
};
