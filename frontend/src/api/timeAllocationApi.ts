import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './client';

export interface DailySum {
  work_date: string;
  total_hours: number;
}

export function useDailySum(userId: number | null, from: string, to: string) {
  return useQuery({
    queryKey: ['time-allocations', 'daily-sum', userId, from, to],
    queryFn: () =>
      apiFetch<DailySum[]>(`/time-allocations/daily-sum?user_id=${userId}&from=${from}&to=${to}`),
    enabled: userId != null && !!from && !!to,
  });
}
