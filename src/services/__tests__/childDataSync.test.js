jest.mock('../api', () => ({
  studentService: {
    fetchDayData: jest.fn(async id => ({ childId: id, sessions: [] })),
    fetchHomeData: jest.fn(async id => ({ childId: id, examPeriods: [], upcomingExams: [] })),
    fetchCourses: jest.fn(async id => [{ childId: id }]),
    fetchPayments: jest.fn(async id => [{ childId: id }]),
    fetchAnnouncements: jest.fn(async (_classId, id) => [{ childId: id }]),
    fetchAttendanceHistory: jest.fn(async id => [{ childId: id }]),
    fetchResults: jest.fn(async id => ({ childId: id, results: [], summary: {} })),
    fetchNotifications: jest.fn(async (_parentId, id) => [{ childId: id }]),
    fetchUnreadNotificationCount: jest.fn(async () => 3),
  },
}));

const { QueryClient } = require('@tanstack/react-query');
const { prefetchChildSnapshot } = require('../childDataSync');

it('warms only the selected child keys and never aliases another child snapshot', async () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const child = { id: 'child-b', name: 'B', class: '4B', raw: { classId: 42 } };

  await prefetchChildSnapshot(queryClient, child, 'parent-a');

  expect(queryClient.getQueryData(['courses', 'child-b'])).toEqual([{ childId: 'child-b' }]);
  expect(queryClient.getQueryData(['payments', 'child-b'])).toEqual([{ childId: 'child-b' }]);
  expect(queryClient.getQueryData(['announcements', 42, 'child-b'])).toEqual([{ childId: 'child-b' }]);
  expect(queryClient.getQueryData(['notifications', 'parent-a', 'child-b'])).toEqual([{ childId: 'child-b' }]);
  expect(queryClient.getQueryData(['courses', 'child-a'])).toBeUndefined();
  expect(queryClient.getQueryData(['payments', 'child-a'])).toBeUndefined();
  queryClient.clear();
});

