import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Student,
  PaymentRecord,
  StudentDayData,
  Notification,
  Announcement,
} from '../types';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.106:3000';

const PARENT_ID_KEY = 'snapschool_parent_id';
const STUDENTS_CACHE_KEY = 'snapschool_students_cache';

// ─── Auth Storage ────────────────────────────────────────────────────────────
export const authStorage = {
  saveParentId: (id: string) => AsyncStorage.setItem(PARENT_ID_KEY, id),
  getParentId: () => AsyncStorage.getItem(PARENT_ID_KEY),
  clear: () => AsyncStorage.multiRemove([PARENT_ID_KEY, STUDENTS_CACHE_KEY]),
};

// ─── Helper for Fetching ─────────────────────────────────────────────────────
const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 30000); // 30s timeout
  const startTime = Date.now();
  const url = `${API_BASE_URL}${endpoint}`;
  console.log(`[DEBUG-API] Calling: ${url}`);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    clearTimeout(id);
    const duration = Date.now() - startTime;

    if (!response.ok) {
      const text = await response.text();
      console.warn(`API Error [${response.status}] [${duration}ms] ${endpoint}: ${text}`);
      return null;
    }

    return await response.json();
  } catch (error: any) {
    clearTimeout(id);
    const duration = Date.now() - startTime;
    if (error.name === 'AbortError') {
      console.error(`Network Error (Timeout) [${duration}ms]: The request to ${endpoint} took too long.`);
    } else {
      console.error(`Network Error [${duration}ms] for ${endpoint}:`, error);
    }
    return null;
  }
};

// ─── Map raw DB student to mobile Student type ─────────────────────────────
const mapStudent = (s: any): Student & { raw: any } => ({
  id: s.id,
  name: `${s.name} ${s.surname}`,
  class: s.class?.name || 'No Class',
  avatarUrl: s.img || `https://i.pravatar.cc/100?u=${s.id}`,
  raw: s,
});

// ─── Parent Auth Service ──────────────────────────────────────────────────────
export const authService = {
  /**
   * Sign in by email — looks up the parent in the DB, stores parentId locally.
   * Returns { success, error, parentName, students }
   */
  login: async (email: string): Promise<{ success: boolean; error?: string; parentName?: string }> => {
    const data = await apiFetch('/api/mobile/login', {
      method: 'POST',
      body: JSON.stringify({ email }),
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

  fetchParentProfile: async (): Promise<{ name: string; surname: string } | null> => {
    const parentId = await authStorage.getParentId();
    if (!parentId) return null;
    const data = await apiFetch(`/api/mobile/parent?id=${parentId}`);
    return data || null;
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
      sessions: home.sessions.map((s: any, i: number) => ({
        id: s.id || i,
        subject: s.subject,
        room: s.room,
        time: `${s.startTime} - ${s.endTime}`,
        attendance: s.attendance === 'PRESENT' ? 'Pres' : s.attendance === 'ABSENT' ? 'Abs' : s.attendance === 'LATE' ? 'Late' : 'Pres',
        iconName: 'Book',
        color: '#0055d4',
      })),
      notes: home.teacherRemarks.map((r: any) => ({
        id: r.id,
        text: r.note,
        subject: r.subject,
        teacher: r.teacher,
      })),
      files: [],
      homeworkDue: home.tasksDue,
      homeworkGiven: home.tasksGiven,
      exams: home.upcomingExams.map((e: any) => ({
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
    if (!s || !s.payments) return [];

    const MONTH_NAMES = [
      '', 'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];

    return s.payments.map((p: any) => ({
      id: p.id,
      month: `${MONTH_NAMES[p.month] || p.month} ${p.year}`,
      totalAmount: p.amount,
      paidAmount: p.status === 'PAID' ? p.amount : p.deferredAmount || 0,
      status: p.status === 'PAID' ? 'Paid' : p.status === 'PARTIAL' ? 'Partial' : p.status === 'OVERDUE' ? 'Due' : 'Due',
      isOverdue: p.status === 'OVERDUE',
    }));
  },

  fetchExams: async (studentId: string, date: string): Promise<any[]> => {
    const data = await studentService.fetchDayData(studentId, date);
    return data.exams;
  },

  fetchNotifications: async (_studentId: string): Promise<Notification[]> => {
    // Will be expanded with a real Notification model later
    return [];
  },

  fetchAnnouncements: async (classId?: number): Promise<Announcement[]> => {
    const url = classId ? `/api/mobile/announcements?classId=${classId}` : '/api/mobile/announcements';
    const data = await apiFetch(url);
    return Array.isArray(data) ? data : [];
  },
  
  fetchAttendanceHistory: async (studentId: string): Promise<AttendanceHistoryDay[]> => {
    const data = await apiFetch(`/api/mobile/attendance/history?studentId=${studentId}`);
    return Array.isArray(data) ? data : [];
  },
};
