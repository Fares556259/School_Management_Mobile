import type { QueryClient } from '@tanstack/react-query';
import type { Student } from '../types';
import { studentService } from './api';
import { formatLocalDateKey } from '../utils/dateUtils';

type ChildWithRaw = Student & { raw?: { classId?: number | null } };

const getTodayKey = () => formatLocalDateKey();

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
  const classId = child.raw?.classId;
  const today = getTodayKey();
  const options = { staleTime: 2 * 60_000 };

  const requests = [
    queryClient.prefetchQuery({ queryKey: ['studentDay', studentId, today], queryFn: () => studentService.fetchDayData(studentId, today), ...options }),
    queryClient.prefetchQuery({ queryKey: ['courses', studentId], queryFn: () => studentService.fetchCourses(studentId), ...options }),
    queryClient.prefetchQuery({ queryKey: ['payments', studentId], queryFn: () => studentService.fetchPayments(studentId, false), ...options }),
    queryClient.prefetchQuery({ queryKey: ['announcements', classId, studentId], queryFn: () => studentService.fetchAnnouncements(classId || undefined, studentId), ...options }),
  ];

  if (parentId) {
    requests.push(
      queryClient.prefetchQuery({ queryKey: ['notifications', parentId, studentId], queryFn: () => studentService.fetchNotifications(parentId, studentId), ...options }),
      queryClient.prefetchQuery({ queryKey: ['notifCount', parentId, studentId], queryFn: () => studentService.fetchUnreadNotificationCount(parentId, studentId), ...options }),
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

