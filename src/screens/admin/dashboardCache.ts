import type { QueryClient } from '@tanstack/react-query';

export const dashboardStaleTime = 30_000;
export const dashboardQueryKey = (userId: string | null, month: number, year: number) =>
  ['admin', 'dashboard', userId, month, year] as const;

export function shouldRefreshDashboard(client: QueryClient, key: ReturnType<typeof dashboardQueryKey>) {
  const state = client.getQueryState(key);
  if (!key[2] || state?.fetchStatus === 'fetching') return false;
  return !state?.dataUpdatedAt || state.isInvalidated || Date.now() - state.dataUpdatedAt > dashboardStaleTime;
}
