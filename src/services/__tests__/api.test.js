jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(), setItem: jest.fn(), multiGet: jest.fn(), multiRemove: jest.fn(),
}));

const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const response = (data, status = 200) => ({ ok: status < 400, status, json: async () => data, text: async () => JSON.stringify(data) });
const tick = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
let storage, api, emit, originalFetch;

beforeEach(() => {
  jest.resetModules();
  storage = require('@react-native-async-storage/async-storage');
  storage.getItem.mockResolvedValue(null);
  storage.setItem.mockResolvedValue();
  storage.multiGet.mockImplementation(async keys => keys.map(key => [key, null]));
  storage.multiRemove.mockResolvedValue();
  api = require('../api');
  emit = jest.spyOn(require('react-native').DeviceEventEmitter, 'emit').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  originalFetch = global.fetch;
  global.fetch = jest.fn();
});
afterEach(() => {
  global.fetch = originalFetch;
  jest.restoreAllMocks();
  jest.useRealTimers();
});
const login = async (token = 'account-a', school = 'school-a', user = 'parent-a') => {
  await Promise.all([api.authStorage.saveToken(token), api.authStorage.saveSchoolId(school), api.authStorage.saveUserId(user)]);
};

it('shares a cold credential read and caches missing credentials too', async () => {
  const cold = deferred();
  storage.getItem.mockReturnValueOnce(cold.promise);
  const reads = [api.authStorage.getToken(), api.authStorage.getToken(), api.authStorage.getToken()];
  expect(storage.getItem).toHaveBeenCalledTimes(1);
  cold.resolve(null);
  expect(await Promise.all(reads)).toEqual([null, null, null]);
  expect(await api.authStorage.getToken()).toBeNull();
  expect(storage.getItem).toHaveBeenCalledTimes(1);
});

it('does not restore an old credential when a disk read finishes after login', async () => {
  const cold = deferred();
  storage.getItem.mockReturnValueOnce(cold.promise);
  const read = api.authStorage.getToken();
  await api.authStorage.saveToken('new-account');
  cold.resolve('previous-account');
  expect(await read).toBe('new-account');
  expect(await api.authStorage.getToken()).toBe('new-account');
});

it('does not restore credentials when preload finishes after logout', async () => {
  const cold = deferred();
  storage.multiGet.mockReturnValueOnce(cold.promise);
  const preload = api.authStorage.preload();
  await api.authStorage.clear();
  cold.resolve([['snapschool_user_id', 'old-user'], ['snapschool_user_role', 'parent'], ['snapschool_school_id', 'old-school'], ['snapschool_jwt_token', 'old-token']]);
  await preload;
  expect(await api.authStorage.isLoggedIn()).toBe(false);
  expect(await api.authStorage.getSchoolId()).toBeNull();
});

it('does not read old disk credentials while logout cache cleanup is still running', async () => {
  await login();
  const cleanup = deferred();
  require('../accountCleanup').registerAccountCleanup(() => cleanup.promise);
  const logout = api.authStorage.clear();
  storage.multiGet.mockImplementation(async keys => keys.map(key => [key, 'previous-account']));
  await api.authStorage.preload();
  expect(await api.authStorage.getToken()).toBeNull();
  expect(storage.multiGet).not.toHaveBeenCalled();
  cleanup.resolve();
  await logout;
});

it('shares simultaneous identical reads, then fetches fresh data on the next refresh', async () => {
  await login();
  const pending = deferred();
  fetch.mockReturnValueOnce(pending.promise).mockResolvedValue(response({ balance: 200 }));
  const first = api.adminService.fetchDashboard(10, 2026);
  const second = api.adminService.fetchDashboard(10, 2026);
  await tick();
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer account-a');
  pending.resolve(response({ balance: 100 }));
  expect(await Promise.all([first, second])).toEqual([{ balance: 100 }, { balance: 100 }]);
  expect(await api.adminService.fetchDashboard(10, 2026)).toEqual({ balance: 200 });
  expect(fetch).toHaveBeenCalledTimes(2);
});

it('preserves sharing of identical financial submissions without retrying them', async () => {
  await login();
  const pending = deferred();
  fetch.mockReturnValue(pending.promise);
  const payload = { title: 'Synthetic expense', amount: 25, category: 'test' };
  const first = api.adminService.recordExpense(payload);
  const second = api.adminService.recordExpense(payload);
  await tick();
  expect(fetch).toHaveBeenCalledTimes(1);
  pending.resolve(response({ success: true }));
  expect(await Promise.all([first, second])).toEqual([{ success: true }, { success: true }]);
});

it('never starts a request with an already canceled signal', async () => {
  const controller = new AbortController();
  controller.abort();
  expect(await api.adminService.sendMessage({ message: 'test', signal: controller.signal })).toEqual({ aborted: true });
  expect(fetch).not.toHaveBeenCalled();
  expect(storage.getItem).not.toHaveBeenCalled();
});

it('canceling one chat request leaves an identical independent request working and removes listeners', async () => {
  await login();
  const firstController = new AbortController();
  const secondController = new AbortController();
  const removeListener = jest.spyOn(firstController.signal, 'removeEventListener');
  const pending = [];
  fetch.mockImplementation((_url, options) => {
    const call = deferred();
    options.signal.addEventListener('abort', () => call.reject(Object.assign(new Error('Canceled'), { name: 'AbortError' })));
    pending.push(call);
    return call.promise;
  });
  const first = api.adminService.sendMessage({ message: 'same', signal: firstController.signal });
  const second = api.adminService.sendMessage({ message: 'same', signal: secondController.signal });
  await tick();
  expect(fetch).toHaveBeenCalledTimes(2);
  firstController.abort();
  pending[1].resolve(response({ reply: 'ready' }));
  expect(await first).toEqual({ aborted: true });
  expect(await second).toEqual({ reply: 'ready' });
  expect(removeListener).toHaveBeenCalledWith('abort', expect.any(Function));
});

it('keeps the timeout active while the response body is loading, then clears it', async () => {
  jest.useFakeTimers();
  await login();
  fetch.mockImplementation(async (_url, options) => ({ ok: true, status: 200, json: () => new Promise((_resolve, reject) => {
    options.signal.addEventListener('abort', () => reject(Object.assign(new Error('timeout'), { name: 'AbortError' })));
  }) }));
  const request = api.adminService.fetchDashboard();
  await tick();
  expect(jest.getTimerCount()).toBe(1);
  await jest.advanceTimersByTimeAsync(30000);
  expect(await request).toBeNull();
  expect(jest.getTimerCount()).toBe(0);
});

it('does not sign out the new account when the previous account returns a delayed 401', async () => {
  await login();
  const old = deferred();
  fetch.mockReturnValueOnce(old.promise).mockResolvedValue(response({ owner: 'b' }));
  const oldRequest = api.adminService.fetchDashboard();
  await tick();
  await login('account-b', 'school-b', 'parent-b');
  const current = api.adminService.fetchDashboard();
  old.resolve(response({ error: 'Expired' }, 401));
  expect(await oldRequest).toBeNull();
  expect(await current).toEqual({ owner: 'b' });
  expect(fetch.mock.calls[1][1].headers['x-school-id']).toBe('school-b');
  expect(emit).not.toHaveBeenCalled();
});

it('discards a successful response body completed after logout', async () => {
  await login();
  const body = deferred();
  fetch.mockResolvedValue({ ok: true, status: 200, json: () => body.promise });
  const request = api.adminService.fetchDashboard();
  await tick();
  await api.authStorage.clear();
  body.resolve({ private: 'old-account' });
  expect(await request).toBeNull();
});

it('keeps normal 401 sign-out handling and does not sign out on anonymous login failures', async () => {
  fetch.mockResolvedValue(response({ success: false, error: 'Unauthorized' }, 401));
  await api.authService.checkPhoneStatus('000', 'parent');
  expect(emit).not.toHaveBeenCalled();
  await login();
  await api.adminService.fetchDashboard();
  expect(emit).toHaveBeenCalledWith('auth_unauthorized');
});

it('uses only the current family cache when offline and safely ignores malformed data', async () => {
  await login();
  fetch.mockRejectedValue(new Error('Offline'));
  const students = [{ id: 'student-a', name: 'Child', surname: 'A' }];
  storage.getItem.mockResolvedValue(JSON.stringify({ userId: 'parent-a', schoolId: 'school-a', students }));
  expect((await api.parentService.fetchChildren()).map(child => child.id)).toEqual(['student-a']);
  storage.getItem.mockResolvedValue(JSON.stringify({ userId: 'parent-b', schoolId: 'school-a', students }));
  expect(await api.parentService.fetchChildren()).toEqual([]);
  storage.getItem.mockResolvedValue('{broken');
  expect(await api.parentService.fetchChildren()).toEqual([]);
});

it('does not return or persist previous family data after an account change', async () => {
  await login();
  const pending = deferred();
  fetch.mockReturnValue(pending.promise);
  const request = api.parentService.fetchChildren();
  await tick();
  await login('account-b', 'school-b', 'parent-b');
  storage.setItem.mockClear();
  pending.resolve(response([{ id: 'student-a', name: 'Child', surname: 'A' }]));
  expect(await request).toEqual([]);
  expect(storage.setItem).not.toHaveBeenCalled();
});

it('keeps an older offline cache only when each child proves parent and school ownership', async () => {
  await login();
  fetch.mockRejectedValue(new Error('Offline'));
  const child = { id: 'child-a', name: 'Child', surname: 'A', parentId: 'parent-a', schoolId: 'school-a' };
  storage.getItem.mockResolvedValue(JSON.stringify([child]));
  expect((await api.parentService.fetchChildren()).map(student => student.id)).toEqual(['child-a']);
  storage.getItem.mockResolvedValue(JSON.stringify([{ ...child, schoolId: 'school-b' }]));
  expect(await api.parentService.fetchChildren()).toEqual([]);
  storage.getItem.mockResolvedValue(JSON.stringify([{ ...child, parentId: 'parent-b' }]));
  expect(await api.parentService.fetchChildren()).toEqual([]);
});

it('saves login children with account ownership and preserves the tuition cache', async () => {
  const children = [{ id: 'child-a', name: 'Child', surname: 'A', class: { level: { tuitionFee: 350 } } }];
  fetch.mockResolvedValueOnce(response({ success: true, token: 'account-a', userId: 'parent-a', userType: 'parent', schoolId: 'school-a', students: children }));
  expect((await api.authService.authenticate('000', 'synthetic-password', 'signin', 'parent')).success).toBe(true);
  const saved = storage.setItem.mock.calls.find(([key]) => key === 'snapschool_students_cache')[1];
  expect(JSON.parse(saved)).toEqual({ userId: 'parent-a', schoolId: 'school-a', students: children });
  storage.getItem.mockResolvedValue(saved);
  fetch.mockResolvedValue(response([]));
  const payments = await api.studentService.fetchPayments('child-a');
  expect(payments).toHaveLength(10);
  expect(payments.every(payment => payment.totalAmount === 350)).toBe(true);
});
