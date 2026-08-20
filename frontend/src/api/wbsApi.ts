import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './client';
import type { WbsStatus } from '../shared/constants';

export type MemberStatus = 'ACTIVE' | 'WITHDRAWN';

export interface TimeAllocation {
  work_date: string;
  hours: number;
}

export interface Wbs {
  id: number;
  writer_id: number;
  writer_name: string;
  writer_status: MemberStatus;
  assignee_id: number;
  assignee_name: string;
  assignee_status: MemberStatus;
  title: string;
  content: string | null;
  start_date: string;
  end_date: string;
  status: WbsStatus;
  time_allocations: TimeAllocation[];
}

export function useWbsList(from: string, to: string) {
  return useQuery({
    queryKey: ['wbs', 'list', from, to],
    queryFn: () => apiFetch<Wbs[]>(`/wbs?from=${from}&to=${to}`),
  });
}
