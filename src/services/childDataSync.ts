import type { QueryClient } from '@tanstack/react-query';
import type { Student } from '../types';
import { studentService } from './api';
import { formatLocalDateKey } from '../utils/dateUtils';

type ChildWithRaw = Student & { raw?: { classId?: number | null } };

const getTodayKey = () => formatLocalDateKey();
const primaryOptions = { staleTime: 2 * 60_000, gcTime: 24 * 60 * 60_000 };

const fetchExamOverview = async (studentId: string, date: string) => {
  const data = await studentService.fetchHomeData(studentId, date);
  const periods = new Map<number, any>();
  for (const period of data.examPeriods || []) {
    if (!periods.has(period.period) || period.pdfUrl) periods.set(period.period, period);
  }
  return {
    examPeriods: Array.from(periods.values()).sort((a, b) => a.period - b.period),
    upcomingExams: (data.upcomingExams || []).slice(0, 5),
  };
};

/**
 * Warms an isolated snapshot for one child. Screens use these exact keys, so a
 * switch can render the child's own data immediately and revalidate it without
 * ever falling back to the previously selected child's records.
 */
export const prefetchChildSnapshot = (
  queryClient: QueryClient,
  child: ChildWithRaw,
  parentId: string | null,
) => {
  const studentId = child.id;
  const today = getTodayKey();
  const requests = [
    prefetchChildHome(queryClient, child),
    prefetchChildTabs(queryClient, child),
  ];

  if (parentId) {
    requests.push(
      queryClient.prefetchQuery({ queryKey: ['notifications', parentId, studentId], queryFn: () => studentService.fetchNotifications(parentId, studentId), ...primaryOptions }),
      queryClient.prefetchQuery({ queryKey: ['notifCount', parentId, studentId], queryFn: () => studentService.fetchUnreadNotificationCount(parentId, studentId), ...primaryOptions }),
    );
  }

  return Promise.allSettled(requests).then(async results => {
    // Lower-frequency screens warm after the navigation-critical snapshot so
    // they never compete with the header, home, courses, or payments paint.
    await queryClient.prefetchQuery({ queryKey: ['attendanceHistory', studentId, 30], queryFn: () => studentService.fetchAttendanceHistory(studentId), staleTime: 5 * 60_000 });
    await queryClient.prefetchQuery({ queryKey: ['results', studentId], queryFn: () => studentService.fetchResults(studentId), staleTime: 5 * 60_000 });
    await queryClient.prefetchQuery({ queryKey: ['exams', studentId], queryFn: () => fetchExamOverview(studentId, today), staleTime: 5 * 60_000 });
    return results;
  });
};

/** Warm only the first screen a parent sees after choosing a child. */
export const prefetchChildHome = (queryClient: QueryClient, child: ChildWithRaw) => {
  const today = getTodayKey();
  return queryClient.prefetchQuery({
    queryKey: ['studentDay', child.id, today],
    queryFn: () => studentService.fetchDayData(child.id, today),
    ...primaryOptions,
  });
};

/** Warm the main tabs after the selected child's home snapshot has priority. */
export const prefetchChildTabs = (queryClient: QueryClient, child: ChildWithRaw) => {
  const classId = child.raw?.classId;
  return Promise.allSettled([
    queryClient.prefetchQuery({ queryKey: ['courses', child.id], queryFn: () => studentService.fetchCourses(child.id), ...primaryOptions }),
    queryClient.prefetchQuery({ queryKey: ['payments', child.id], queryFn: () => studentService.fetchPayments(child.id, false), ...primaryOptions }),
    queryClient.prefetchQuery({ queryKey: ['announcements', classId, child.id], queryFn: () => studentService.fetchAnnouncements(classId || undefined, child.id), ...primaryOptions }),
  ]);
};

