import { useMutation, useQuery } from '@tanstack/react-query';
import { apiFetch } from './client';
import { queryClient } from './queryClient';
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

export function useMyWbsList(status?: WbsStatus) {
  return useQuery({
    queryKey: ['wbs', 'mine', status ?? 'ALL'],
    queryFn: () =>
      apiFetch<Wbs[]>(`/wbs?mine=true${status ? `&status=${status}` : ''}`),
  });
}

export function useWbs(id: string | null) {
  return useQuery({
    queryKey: ['wbs', 'detail', id],
    queryFn: () => apiFetch<Wbs>(`/wbs/${id}`),
    enabled: id != null,
  });
}

export interface WbsInput {
  assignee_id: number;
  title: string;
  content: string;
  start_date: string;
  end_date: string;
  status: WbsStatus;
  time_allocations: TimeAllocation[];
}

export function useCreateWbs() {
  return useMutation({
    mutationFn: (body: WbsInput) =>
      apiFetch<Wbs>('/wbs', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wbs'] }),
  });
}

export function useUpdateWbs(id: string) {
  return useMutation({
    mutationFn: (body: WbsInput) =>
      apiFetch<Wbs>(`/wbs/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wbs'] }),
  });
}

export function useDeleteWbs() {
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/wbs/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wbs'] }),
  });
}
