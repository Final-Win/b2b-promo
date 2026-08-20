import { create } from 'zustand';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiFetch } from './client';
import { queryClient } from './queryClient';

export type Role = 'ADMIN' | 'USER';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
}

interface LoginResponse {
  access_token: string;
  user: User;
}

interface AuthState {
  accessToken: string | null;
  setAccessToken: (token: string | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  setAccessToken: (token) => set({ accessToken: token }),
}));

export function useLogin() {
  return useMutation({
    mutationFn: (body: { email: string; password: string }) =>
      apiFetch<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: (data) => {
      useAuthStore.getState().setAccessToken(data.access_token);
    },
  });
}

export function useSignup() {
  return useMutation({
    mutationFn: (body: { email: string; password: string; name: string }) =>
      apiFetch<User>('/auth/signup', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
  });
}

export function useLogout() {
  return useMutation({
    mutationFn: () => apiFetch<void>('/auth/logout', { method: 'POST' }),
    onSuccess: () => {
      useAuthStore.getState().setAccessToken(null);
      queryClient.clear();
    },
  });
}

export function useWithdraw() {
  return useMutation({
    mutationFn: () => apiFetch<void>('/auth/me', { method: 'DELETE' }),
    onSuccess: () => {
      useAuthStore.getState().setAccessToken(null);
      queryClient.clear();
    },
  });
}

export function useMe(enabled = true) {
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => apiFetch<User>('/auth/me'),
    enabled,
  });
}
