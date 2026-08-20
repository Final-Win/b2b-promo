export const WBS_STATUSES = ['TODO', 'IN_PROGRESS', 'QA', 'RESOLVED', 'DONE'] as const;

export type WbsStatus = (typeof WBS_STATUSES)[number];

export const WBS_STATUS_COLORS: Record<WbsStatus, string> = {
  TODO: '#9ca3af',
  IN_PROGRESS: '#38bdf8',
  QA: '#0ea5e9',
  RESOLVED: '#4ade80',
  DONE: '#16a34a',
};

export const DAILY_BASE_HOURS = 8;
