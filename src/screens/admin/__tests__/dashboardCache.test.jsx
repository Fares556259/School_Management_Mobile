import { QueryClient } from '@tanstack/react-query';
import { dashboardQueryKey, shouldRefreshDashboard } from '../dashboardCache';

it('reuses fresh results, refreshes stale results and separates administrator accounts', () => {
  const client = new QueryClient({defaultOptions:{queries:{gcTime:Infinity}}});
  const key = dashboardQueryKey('admin-a', 10, 2026);
  client.setQueryData(key, {collected:6405});
  expect(shouldRefreshDashboard(client,key)).toBe(false);
  expect(client.getQueryData(dashboardQueryKey('admin-b',10,2026))).toBeUndefined();
  expect(client.getQueryData(dashboardQueryKey('admin-a',11,2026))).toBeUndefined();
  client.setQueryData(key,{collected:6405},{updatedAt:Date.now()-31000});
  expect(shouldRefreshDashboard(client,key)).toBe(true);
  expect(shouldRefreshDashboard(client,dashboardQueryKey(null,10,2026))).toBe(false);
  client.clear();
});

it('refreshes after payment invalidation without starting a second request during fetching', async () => {
  const client = new QueryClient({defaultOptions:{queries:{gcTime:Infinity,retry:false}}});
  const key = dashboardQueryKey('admin-a',10,2026);
  client.setQueryData(key,{collected:6405});
  await client.invalidateQueries({queryKey:['admin'],refetchType:'none'});
  expect(shouldRefreshDashboard(client,key)).toBe(true);
  let finish;
  const request = client.fetchQuery({queryKey:key,queryFn:()=>new Promise(resolve=>{finish=resolve;})});
  expect(shouldRefreshDashboard(client,key)).toBe(false);
  finish({collected:6825}); await request;
  expect(client.getQueryData(key)).toEqual({collected:6825});
  expect(shouldRefreshDashboard(client,key)).toBe(false);
  client.clear();
});
