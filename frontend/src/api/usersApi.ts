import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './client';
import type { MemberStatus } from './wbsApi';

export interface UserListItem {
  id: number;
  name: string;
  status: MemberStatus;
}

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => apiFetch<UserListItem[]>('/users'),
  });
}
