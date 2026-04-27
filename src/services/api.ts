import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Student,
  PaymentRecord,
  StudentDayData,
  Notification,
  Announcement,
} from '../types';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://127.0.0.1:3000';

const USER_ID_KEY = 'snapschool_user_id';
const USER_ROLE_KEY = 'snapschool_user_role';
const SCHOOL_ID_KEY = 'snapschool_school_id';
const STUDENTS_CACHE_KEY = 'snapschool_students_cache';

// ─── Helper for URL Normalization ───────────────────────────────────────────
/**
 * Prepends the API base URL if the provided URL is a relative path.
 */
export const getFullImageUrl = (url: string | null): string | null => {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  
  if (trimmed.startsWith('http')) return trimmed;
  
  const cleanUrl = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  const fullUrl = `${API_BASE_URL}${cleanUrl}`;
  
  console.log(`[DEBUG-IMAGE] Normalized: ${trimmed} -> ${fullUrl}`);
  return fullUrl;
};

// ─── Auth Storage ────────────────────────────────────────────────────────────
export const authStorage = {
  saveUserId: (id: string) => AsyncStorage.setItem(USER_ID_KEY, id),
  getUserId: () => AsyncStorage.getItem(USER_ID_KEY),
  saveUserRole: (role: string) => AsyncStorage.setItem(USER_ROLE_KEY, role),
  getUserRole: () => AsyncStorage.getItem(USER_ROLE_KEY),
  saveSchoolId: (id: string) => AsyncStorage.setItem(SCHOOL_ID_KEY, id),
  getSchoolId: () => AsyncStorage.getItem(SCHOOL_ID_KEY),
  clear: () => AsyncStorage.multiRemove([USER_ID_KEY, USER_ROLE_KEY, SCHOOL_ID_KEY, STUDENTS_CACHE_KEY]),
  isLoggedIn: async () => {
    const id = await AsyncStorage.getItem(USER_ID_KEY);
    return !!id;
  },
  // Legacy compatibility wrappers
  getParentId: () => AsyncStorage.getItem(USER_ID_KEY),
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
      const schoolId = await authStorage.getSchoolId();
      const url = `${API_BASE_URL}${endpoint}`;
      console.log(`[DEBUG-API] Calling: ${url}`);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'x-school-id': schoolId || 'default_school',
          ...options.headers,
        },
      });
      
      if (timeoutId) clearTimeout(timeoutId);
      const duration = Date.now() - startTime;

      if (!response.ok) {
        const text = await response.text();
        console.warn(`API Error [${response.status}] [${duration}ms] ${endpoint}: ${text}`);
        try {
          // Attempt to parse error as JSON
          return JSON.parse(text);
        } catch (e) {
          // Fallback for non-JSON errors
          return null;
        }
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
  avatarUrl: getFullImageUrl(s.img),
  raw: s,
});

// ─── Auth Service ────────────────────────────────────────────────────────────
export const authService = {
  checkPhoneStatus: async (phone: string): Promise<{ success: boolean; status?: 'NEEDS_SETUP' | 'NEEDS_PASSWORD'; error?: string; name?: string; img?: string }> => {
    const data = await apiFetch('/api/mobile/login', {
      method: 'POST',
      body: JSON.stringify({ phone: phone.trim() }),
    });

    if (!data) return { success: false, error: 'Network error or account not found.' };
    return {
      success: true,
      status: data.status,
      name: data.name,
      img: data.img
    };
  },

  authenticate: async (phone: string, password: string, action: 'setup' | 'signin'): Promise<{ success: boolean; error?: string }> => {
    const response = await apiFetch('/api/mobile/auth', {
      method: 'POST',
      body: JSON.stringify({ phone: phone.trim(), password, action }),
    });

    if (!response) {
      return { success: false, error: 'Network error. Please try again.' };
    }

    if (!response.success) {
      return { success: false, error: response.error || 'Authentication aborted.' };
    }

    if (response.userId) await authStorage.saveUserId(response.userId);
    if (response.userType) await authStorage.saveUserRole(response.userType);
    if (response.schoolId) await authStorage.saveSchoolId(response.schoolId);
    
    if (response.students) {
      await AsyncStorage.setItem(STUDENTS_CACHE_KEY, JSON.stringify(response.students));
    }
    
    return { success: true };
  },

  logout: async () => {
    await authStorage.clear();
  },

  registerPushToken: async (uid: string, pushToken: string) => {
    const role = await authStorage.getUserRole();
    const endpoint = role === 'teacher' ? '/api/mobile/teacher/push-token' : '/api/mobile/parent/push-token';
    const body = role === 'teacher' ? { teacherId: uid, pushToken } : { parentId: uid, pushToken };
    
    return apiFetch(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  isLoggedIn: async (): Promise<boolean> => {
    const id = await authStorage.getParentId();
    return !!id;
  },
};

// ─── Parent Data Service ──────────────────────────────────────────────────────
export const parentService = {
  getParentId: async () => {
    return await authStorage.getParentId();
  },
  fetchChildren: async (): Promise<(Student & { raw?: any })[]> => {
    const uid = await authStorage.getUserId();

    // Try cache first while fetching
    const cached = await AsyncStorage.getItem(STUDENTS_CACHE_KEY);

    const data = await apiFetch(`/api/mobile/students?parentId=${uid}`);

    if (!data && cached) {
      const parsed = JSON.parse(cached);
      return parsed.map(mapStudent);
    }
    if (!data) return [];

    await AsyncStorage.setItem(STUDENTS_CACHE_KEY, JSON.stringify(data));
    return data.map(mapStudent);
  },

  fetchParentProfile: async (): Promise<{ name: string; surname: string; phone: string; img: string | null } | null> => {
    const uid = await authStorage.getUserId();
    const role = await authStorage.getUserRole();
    if (!uid) return null;
    
    const endpoint = role === 'teacher' ? `/api/mobile/teacher?id=${uid}` : `/api/mobile/parent?id=${uid}`;
    const data = await apiFetch(endpoint);
    
    if (data && data.img) {
      data.img = getFullImageUrl(data.img);
    }
    return data || null;
  },

  updateProfile: async (data: { name?: string; surname?: string; phone?: string; img?: string }) => {
    const uid = await authStorage.getUserId();
    const role = await authStorage.getUserRole();
    const endpoint = role === 'teacher' ? '/api/mobile/teacher' : '/api/mobile/parent';
    
    return apiFetch(endpoint, {
      method: 'PATCH',
      body: JSON.stringify({ id: uid, ...data }),
    });
  },

  linkStudent: async (studentId: string, birthday: string) => {
    const pId = await authStorage.getUserId();
    return apiFetch('/api/mobile/students', {
      method: 'POST',
      body: JSON.stringify({ studentId, parentId: pId, birthday }),
    });
  },

  fetchSchoolInfo: async () => {
    return apiFetch('/api/mobile/school');
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
      holidayName: home.holidayName,
      sessions: (home.sessions || []).map((s: any, i: number) => ({
        id: s.id || i,
        subject: s.subject,
        room: s.room,
        startTime: s.startTime,
        endTime: s.endTime,
        time: `${s.startTime} - ${s.endTime}`,
        attendance: s.attendance,
        score: s.score || 0,
        iconName: 'Book',
        color: '#0055d4',
      })),
      notes: (home.teacherRemarks || []).map((r: any) => ({
        id: r.id,
        text: r.note,
        subject: r.subject,
        teacher: r.teacher,
      })),
      files: (home.resources || []).flatMap((r: any) => {
        const urls = r.url ? r.url.split(',') : [];
        return urls.map((url: string, index: number) => ({
          id: `${r.id}-${index}`,
          name: urls.length > 1 ? `${r.title} (${index + 1})` : r.title,
          url: url,
          sharedBy: r.teacher,
          type: url.toLowerCase().endsWith('.pdf') ? 'pdf' : 'file',
        }));
      }),
      homeworkDue: home.homeworkDue || home.tasksDue || [],
      homeworkGiven: home.homeworkGiven || home.tasksGiven || [],
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

  fetchCourses: async (studentId: string): Promise<any[]> => {
    return await apiFetch(`/api/mobile/courses?studentId=${studentId}`);
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
    if (!Array.isArray(data)) return [];
    return data.map((n: any) => ({
      ...n,
      studentName: typeof n.student === 'object' ? `${n.student.name} ${n.student.surname}` : (n.student || 'Student'),
      studentAvatar: n.student ? getFullImageUrl(n.student.img) : null
    }));
  },

  deleteNotification: async (id: number) => {
    return apiFetch(`/api/mobile/notifications?id=${id}`, {
      method: 'DELETE',
    });
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
    if (!Array.isArray(data)) return [];
    
    return data.map((item: any) => ({
      ...item,
      image: getFullImageUrl(item.img || item.image),
    }));
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

  fetchAllFiles: async (parentId: string): Promise<any[]> => {
    const data = await apiFetch(`/api/mobile/parent/files?parentId=${parentId}`);
    if (!Array.isArray(data)) return [];
    return data.map(file => ({
      ...file,
      url: getFullImageUrl(file.url || file.path),
    }));
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

// ─── Teacher Service ────────────────────────────────────────────────────────────
export const teacherService = {
  fetchProfile: async () => {
    const id = await authStorage.getUserId();
    if (!id) return null;
    return apiFetch(`/api/mobile/teacher?id=${id}`);
  },

  fetchHomeData: async () => {
    const teacherId = await authStorage.getUserId();
    if (!teacherId) return null;
    return apiFetch(`/api/mobile/teacher/home?teacherId=${teacherId}`);
  },

  fetchClasses: async () => {
    const teacherId = await authStorage.getUserId();
    if (!teacherId) return [];
    return apiFetch(`/api/mobile/teacher/classes?teacherId=${teacherId}`);
  },

  fetchClassStudents: async (classId: string, date?: string) => {
    const teacherId = await authStorage.getUserId();
    let url = `/api/mobile/teacher/students?classId=${classId}&teacherId=${teacherId}`;
    if (date) url += `&date=${date}`;
    return apiFetch(url);
  },

  saveAttendance: async (data: { 
    classId: string; 
    date: string; 
    records: { studentId: string; status: string; note?: string; score?: number }[];
    lessonId: number | null;
    task?: { title: string; description?: string };
    resource?: { title: string; url: string };
  }) => {
    const teacherId = await authStorage.getUserId();
    const response = await fetch(`${API_BASE_URL}/api/mobile/teacher/attendance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, teacherId }),
    });
    if (!response.ok) throw new Error("Failed to save attendance");
    return response.json();
  },

  saveLesson: async (lessonData: any) => {
    return apiFetch('/api/mobile/teacher/lessons', {
      method: 'POST',
      body: JSON.stringify(lessonData),
    });
  },

  createTask: async (data: { title: string; description?: string; classId: string; attachments?: any[] }) => {
    const teacherId = await authStorage.getUserId();
    return apiFetch('/api/mobile/teacher/tasks', {
      method: 'POST',
      body: JSON.stringify({ ...data, teacherId }),
    });
  },

  fetchTasks: async () => {
    const teacherId = await authStorage.getUserId();
    return apiFetch(`/api/mobile/teacher/tasks?teacherId=${teacherId}`);
  },
};
