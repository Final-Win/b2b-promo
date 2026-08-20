export const WBS_STATUSES = ['TODO', 'IN_PROGRESS', 'QA', 'RESOLVED', 'DONE'] as const;

export type WbsStatus = (typeof WBS_STATUSES)[number];

export const WBS_STATUS_COLORS: Record<WbsStatus, string> = {
  TODO: '#94a3a0',
  IN_PROGRESS: '#2f6fa6',
  QA: '#245781',
  RESOLVED: '#3fae86',
  DONE: '#08795f',
};

export const DAILY_BASE_HOURS = 8;
