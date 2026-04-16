import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Student,
  PaymentRecord,
  StudentDayData,
  Notification,
  Announcement,
} from '../types';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://172.18.3.31:3000';

const PARENT_ID_KEY = 'snapschool_parent_id';
const STUDENTS_CACHE_KEY = 'snapschool_students_cache';

// ─── Auth Storage ────────────────────────────────────────────────────────────
export const authStorage = {
  saveParentId: (id: string) => AsyncStorage.setItem(PARENT_ID_KEY, id),
  getParentId: () => AsyncStorage.getItem(PARENT_ID_KEY),
  clear: () => AsyncStorage.multiRemove([PARENT_ID_KEY, STUDENTS_CACHE_KEY]),
};

// ─── Helper for Fetching with Deduplication ──────────────────────────────────
const inflightRequests = new Map<string, Promise<any>>();

const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  const requestKey = `${options.method || 'GET'}:${endpoint}:${options.body || ''}`;
  
  if (inflightRequests.has(requestKey)) {
    console.log(`[DEBUG-API] Reusing in-flight request: ${endpoint}`);
    return inflightRequests.get(requestKey);
  }

  const fetchPromise = (async () => {
    let controller: AbortController | undefined;
    let timeoutId: any;
    const startTime = Date.now();

    try {
      controller = new AbortController();
      timeoutId = setTimeout(() => controller?.abort(), 30000);
      const url = `${API_BASE_URL}${endpoint}`;
      console.log(`[DEBUG-API] Calling: ${url}`);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });
      
      if (timeoutId) clearTimeout(timeoutId);
      const duration = Date.now() - startTime;

      if (!response.ok) {
        const text = await response.text();
        console.warn(`API Error [${response.status}] [${duration}ms] ${endpoint}: ${text}`);
        return null;
      }

      return await response.json();
    } catch (error: any) {
      if (timeoutId) clearTimeout(timeoutId);
      const duration = Date.now() - startTime;
      if (error.name === 'AbortError') {
        console.error(`Network Error (Timeout) [${duration}ms]: The request to ${endpoint} took too long.`);
      } else {
        console.error(`Network Error [${duration}ms] for ${endpoint}:`, error);
      }
      return null;
    } finally {
      inflightRequests.delete(requestKey);
    }
  })();

  inflightRequests.set(requestKey, fetchPromise);
  return fetchPromise;
};

// ─── Map raw DB student to mobile Student type ─────────────────────────────
const mapStudent = (s: any): Student & { raw: any } => ({
  id: s.id,
  name: `${s.name} ${s.surname}`,
  class: s.class?.name || 'No Class',
  avatarUrl: s.img || null,
  raw: s,
});

// ─── Parent Auth Service ──────────────────────────────────────────────────────
export const authService = {
  /**
   * Sign in by phone — looks up the parent in the DB, stores parentId locally.
   * Returns { success, error, parentName, students }
   */
  login: async (phone: string): Promise<{ success: boolean; error?: string; parentName?: string }> => {
    const data = await apiFetch('/api/mobile/login', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });

    if (!data) return { success: false, error: 'Network error. Check your connection.' };

    await authStorage.saveParentId(data.parentId);
    // Cache students immediately
    await AsyncStorage.setItem(STUDENTS_CACHE_KEY, JSON.stringify(data.students));
    return { success: true, parentName: data.name };
  },

  logout: async () => {
    await authStorage.clear();
  },

  isLoggedIn: async (): Promise<boolean> => {
    const id = await authStorage.getParentId();
    return !!id;
  },
};

// ─── Parent Data Service ──────────────────────────────────────────────────────
export const parentService = {
  fetchChildren: async (): Promise<(Student & { raw?: any })[]> => {
    const parentId = await authStorage.getParentId();

    // Try cache first while fetching
    const cached = await AsyncStorage.getItem(STUDENTS_CACHE_KEY);

    const data = await apiFetch(`/api/mobile/students?parentId=${parentId}`);

    if (!data && cached) {
      const parsed = JSON.parse(cached);
      return parsed.map(mapStudent);
    }
    if (!data) return [];

    await AsyncStorage.setItem(STUDENTS_CACHE_KEY, JSON.stringify(data));
    return data.map(mapStudent);
  },

  fetchParentProfile: async (): Promise<{ name: string; surname: string; phone: string; img: string } | null> => {
    const parentId = await authStorage.getParentId();
    if (!parentId) return null;
    const data = await apiFetch(`/api/mobile/parent?id=${parentId}`);
    return data || null;
  },

  updateProfile: async (data: { name?: string; surname?: string; phone?: string; img?: string }) => {
    const parentId = await authStorage.getParentId();
    return apiFetch('/api/mobile/parent', {
      method: 'PATCH',
      body: JSON.stringify({ id: parentId, ...data }),
    });
  },

  linkStudent: async (studentId: string, birthday: string) => {
    const parentId = await authStorage.getParentId();
    return apiFetch('/api/mobile/students', {
      method: 'POST',
      body: JSON.stringify({ studentId, parentId, birthday }),
    });
  },
};

// ─── Student Data Service ─────────────────────────────────────────────────────
export const studentService = {
  fetchHomeData: async (studentId: string, dateStr?: string): Promise<{
    sessions: any[];
    tasksDue: any[];
    tasksGiven: any[];
    upcomingExams: any[];
    teacherRemarks: any[];
    examPeriods?: any[];
  }> => {
    const url = dateStr ? `/api/mobile/home?studentId=${studentId}&date=${dateStr}` : `/api/mobile/home?studentId=${studentId}`;
    const data = await apiFetch(url);
    if (!data || !data.sessions) {
      return { sessions: [], tasksDue: [], tasksGiven: [], upcomingExams: [], teacherRemarks: [], examPeriods: [] };
    }
    return data;
  },

  // Legacy alias — keep HomeScreen working during migration
  fetchDayData: async (studentId: string, _date: string): Promise<StudentDayData> => {
    const home = await studentService.fetchHomeData(studentId, _date);
    return {
      sessions: (home.sessions || []).map((s: any, i: number) => ({
        id: s.id || i,
        subject: s.subject,
        room: s.room,
        time: `${s.startTime} - ${s.endTime}`,
        attendance: s.attendance === 'PRESENT' ? 'Pres' : s.attendance === 'ABSENT' ? 'Abs' : s.attendance === 'LATE' ? 'Late' : null,
        iconName: 'Book',
        color: '#0055d4',
      })),
      notes: (home.teacherRemarks || []).map((r: any) => ({
        id: r.id,
        text: r.note,
        subject: r.subject,
        teacher: r.teacher,
      })),
      files: [],
      homeworkDue: (home.tasksDue || []),
      homeworkGiven: (home.tasksGiven || []),
      exams: (home.upcomingExams || []).map((e: any) => ({
        id: e.id,
        subject: e.subject,
        time: new Date(e.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        description: e.title,
        iconName: 'FileText',
        accentColor: '#0055d4',
        bgColor: '#eff6ff',
        tags: [],
      })),
    };
  },

  fetchPayments: async (studentId: string): Promise<PaymentRecord[]> => {
    const cached = await AsyncStorage.getItem(STUDENTS_CACHE_KEY);
    if (!cached) return [];

    const students: any[] = JSON.parse(cached);
    const s = students.find((x) => x.id === studentId);
    if (!s) return [];

    const MONTH_NAMES = [
      '', 'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];

    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();

    // Define the academic cycle: Sep (9) to Jun (6)
    const academicMonths = [
      { month: 9, year: 2025 },
      { month: 10, year: 2025 },
      { month: 11, year: 2025 },
      { month: 12, year: 2025 },
      { month: 1, year: 2026 },
      { month: 2, year: 2026 },
      { month: 3, year: 2026 },
      { month: 4, year: 2026 },
      { month: 5, year: 2026 },
      { month: 6, year: 2026 },
    ];

    const timeline: PaymentRecord[] = academicMonths.map((cycle, index) => {
      // Look for a payment record for this specific month/year
      const p = (s.payments || []).find((x: any) => x.month === cycle.month && x.year === cycle.year);
      
      const dueDate = p?.dueDate || `${cycle.year}-${String(cycle.month).padStart(2, '0')}-01`;
      const due = new Date(dueDate);
      
      // Determine if it's in the past relative to today
      const isPast = due < today;
      const isFuture = cycle.year > currentYear || (cycle.year === currentYear && cycle.month > currentMonth);
      
      if (p) {
        const isOverdue = p.status === 'OVERDUE' || (p.status !== 'PAID' && isPast);
        let overdueDays = 0;
        if (isOverdue) {
          const todayNorm = new Date(today.getFullYear(), today.getMonth(), today.getDate());
          const dueNorm = new Date(due.getFullYear(), due.getMonth(), due.getDate());
          const diffTime = todayNorm.getTime() - dueNorm.getTime();
          overdueDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
        }

        const totalVal = p.amount + (p.deferredAmount || 0);
        const isActuallyPaid = p.status === 'PAID' || p.status === 'PARTIAL';
        return {
          id: p.id,
          month: `${MONTH_NAMES[cycle.month]} ${cycle.year}`,
          totalAmount: totalVal,
          paidAmount: isActuallyPaid ? p.amount : 0,
          status: p.status === 'PAID' ? 'Paid' : p.status === 'PARTIAL' ? 'Partial' : 'Due',
          isOverdue,
          dueDate,
          overdueDays: isOverdue ? overdueDays : 0,
        };
      } else {
        // Placeholder month
        const isOverdue = isPast;
        let overdueDays = 0;
        if (isOverdue) {
          const todayNorm = new Date(today.getFullYear(), today.getMonth(), today.getDate());
          const dueNorm = new Date(due.getFullYear(), due.getMonth(), due.getDate());
          const diffTime = todayNorm.getTime() - dueNorm.getTime();
          overdueDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
        }

        const daysUntil = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        return {
          id: -100 - index, // Virtual ID
          month: `${MONTH_NAMES[cycle.month]} ${cycle.year}`,
          totalAmount: 120, // Default fee
          paidAmount: 0,
          status: isFuture ? 'Locked' : 'Due',
          isOverdue,
          dueDate,
          overdueDays: isOverdue ? overdueDays : 0,
          daysUntil: isFuture ? daysUntil : 0,
        };
      }
    });

    return timeline;
  },

  fetchExams: async (studentId: string, date: string): Promise<any[]> => {
    const data = await studentService.fetchDayData(studentId, date);
    return data.exams;
  },

  fetchNotifications: async (parentId: string, studentId?: string | null): Promise<Notification[]> => {
    let url = `/api/mobile/notifications?parentId=${parentId}`;
    if (studentId) url += `&studentId=${studentId}`;
    const data = await apiFetch(url);
    return Array.isArray(data) ? data : [];
  },

  markNotificationsAsRead: async (notificationIds: number[]) => {
    return apiFetch('/api/mobile/notifications', {
      method: 'PATCH',
      body: JSON.stringify({ notificationIds }),
    });
  },

  fetchAnnouncements: async (classId?: number, studentId?: string): Promise<Announcement[]> => {
    let url = '/api/mobile/announcements';
    const params = new URLSearchParams();
    if (classId) params.append('classId', classId.toString());
    if (studentId) params.append('studentId', studentId);
    
    const queryString = params.toString();
    if (queryString) url += `?${queryString}`;
    
    const data = await apiFetch(url);
    return Array.isArray(data) ? data : [];
  },
  
  fetchAttendanceHistory: async (studentId: string): Promise<AttendanceHistoryDay[]> => {
    const data = await apiFetch(`/api/mobile/attendance/history?studentId=${studentId}`);
    return Array.isArray(data) ? data : [];
  },

  updateImage: async (studentId: string, imgUrl: string) => {
    return apiFetch('/api/mobile/students', {
      method: 'PATCH',
      body: JSON.stringify({ id: studentId, img: imgUrl }),
    });
  },

  fetchResults: async (studentId: string): Promise<{ results: any[], summary: any }> => {
    const data = await apiFetch(`/api/mobile/results?studentId=${studentId}`);
    return data || { results: [], summary: { average: 0, totalSubjects: 0 } };
  },

  justifyAttendance: async (attendanceId: number, imgUrl?: string, note?: string) => {
    return apiFetch('/api/mobile/attendance/justify', {
      method: 'PATCH',
      body: JSON.stringify({ attendanceId, justificationImg: imgUrl, justificationNote: note }),
    });
  },
};

export const uiService = {
  uploadImage: async (uri: string, type: 'profile' | 'student', id: string) => {
    const formData = new FormData();
    
    // Create the file object from the URI
    const uriParts = uri.split('.');
    const fileType = uriParts[uriParts.length - 1];

    formData.append('file', {
      uri,
      name: `photo.${fileType}`,
      type: `image/${fileType}`,
    } as any);
    
    formData.append('type', type);
    formData.append('id', id);

    const response = await fetch(`${API_BASE_URL}/api/mobile/upload`, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (!response.ok) {
      throw new Error('Upload failed');
    }

    return await response.json();
  },
};
