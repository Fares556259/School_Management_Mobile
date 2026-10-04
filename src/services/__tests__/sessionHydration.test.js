jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(), setItem: jest.fn(), multiGet: jest.fn(), multiRemove: jest.fn(),
}));

const { loadSessionSnapshot } = require('../sessionHydration');

const deferred = () => {
  let resolve;
  const promise = new Promise(yes => { resolve = yes; });
  return { promise, resolve };
};

const services = overrides => ({
  parentProfile: jest.fn().mockResolvedValue(null),
  parentChildren: jest.fn().mockResolvedValue([]),
  teacherProfile: jest.fn().mockResolvedValue(null),
  adminProfile: jest.fn().mockResolvedValue(null),
  ...overrides,
});

it('starts parent profile and children reads together and tolerates one failure', async () => {
  const profile = deferred();
  const children = deferred();
  const deps = services({
    parentProfile: jest.fn(() => profile.promise),
    parentChildren: jest.fn(() => children.promise),
  });
  const pending = loadSessionSnapshot('parent', deps);
  expect(deps.parentProfile).toHaveBeenCalledTimes(1);
  expect(deps.parentChildren).toHaveBeenCalledTimes(1);
  profile.resolve({ name: 'Parent' });
  children.resolve([{ id: 'child-a' }]);
  await expect(pending).resolves.toEqual({ role: 'parent', profile: { name: 'Parent' }, children: [{ id: 'child-a' }] });

  deps.parentProfile.mockRejectedValueOnce(new Error('offline'));
  deps.parentChildren.mockResolvedValueOnce([{ id: 'cached-child' }]);
  await expect(loadSessionSnapshot('parent', deps)).resolves.toEqual({ role: 'parent', profile: null, children: [{ id: 'cached-child' }] });
});

it('uses the matching profile endpoint for teachers and admins', async () => {
  const deps = services({
    teacherProfile: jest.fn().mockResolvedValue({ name: 'Teacher' }),
    adminProfile: jest.fn().mockResolvedValue({ name: 'Admin', schoolName: 'School' }),
  });
  expect((await loadSessionSnapshot('teacher', deps)).profile.name).toBe('Teacher');
  expect((await loadSessionSnapshot('admin', deps)).profile.schoolName).toBe('School');
  expect(deps.teacherProfile).toHaveBeenCalledTimes(1);
  expect(deps.adminProfile).toHaveBeenCalledTimes(1);
  expect(deps.parentProfile).not.toHaveBeenCalled();
});
