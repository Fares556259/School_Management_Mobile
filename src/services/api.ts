import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Student,
  PaymentRecord,
  StudentDayData,
  Notification,
  Announcement,
  AttendanceHistoryDay,
} from '../types';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://127.0.0.1:3000';

const USER_ID_KEY = 'snapschool_user_id';
const USER_ROLE_KEY = 'snapschool_user_role';
const SCHOOL_ID_KEY = 'snapschool_school_id';
const JWT_TOKEN_KEY = 'snapschool_jwt_token';
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
  
  if (__DEV__) {
    console.log(`[DEBUG-IMAGE] Normalized: ${trimmed} -> ${fullUrl}`);
  }
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
  saveToken: (token: string) => AsyncStorage.setItem(JWT_TOKEN_KEY, token),
  getToken: () => AsyncStorage.getItem(JWT_TOKEN_KEY),
  clear: () => AsyncStorage.multiRemove([USER_ID_KEY, USER_ROLE_KEY, SCHOOL_ID_KEY, JWT_TOKEN_KEY, STUDENTS_CACHE_KEY]),
  isLoggedIn: async () => {
    const id = await AsyncStorage.getItem(USER_ID_KEY);
    const token = await AsyncStorage.getItem(JWT_TOKEN_KEY);
    return !!id && !!token;
  },
  // Legacy compatibility wrappers
  getParentId: () => AsyncStorage.getItem(USER_ID_KEY),
};

// ─── Helper for Fetching with Deduplication ──────────────────────────────────
const inflightRequests = new Map<string, Promise<any>>();

const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  const requestKey = `${options.method || 'GET'}:${endpoint}:${options.body || ''}`;
  
  if (inflightRequests.has(requestKey)) {
    if (__DEV__) {
      console.log(`[DEBUG-API] Reusing in-flight request: ${endpoint}`);
    }
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
      const token = await authStorage.getToken();
      const url = `${API_BASE_URL}${endpoint}`;
      if (__DEV__) {
        console.log(`[DEBUG-API] Calling: ${url}`);
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-school-id': schoolId || 'default_school',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers as any),
      };

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers,
      });
      
      if (timeoutId) clearTimeout(timeoutId);
      const duration = Date.now() - startTime;

      if (!response.ok) {
        const text = await response.text();
        console.warn(`API Error [${response.status}] [${duration}ms] ${endpoint}: ${text}`);
        
        if (response.status === 401) {
          const { DeviceEventEmitter } = require('react-native');
          DeviceEventEmitter.emit('auth_unauthorized');
        }
        
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
  avatarUrl: getFullImageUrl(s.img),
  raw: s,
});

// ─── Auth Service ────────────────────────────────────────────────────────────
export const authService = {
  checkPhoneStatus: async (phone: string, role: string): Promise<{ success: boolean; status?: 'NEEDS_SETUP' | 'NEEDS_PASSWORD'; error?: string; name?: string; img?: string }> => {
    const data = await apiFetch('/api/mobile/login', {
      method: 'POST',
      body: JSON.stringify({ phone: phone.trim(), role }),
    });

    if (!data) return { success: false, error: 'Network error or account not found.' };
    return {
      success: true,
      status: data.status,
      name: data.name,
      img: data.img
    };
  },

  authenticate: async (phone: string, password: string, action: 'setup' | 'signin', role: string, otpCode?: string): Promise<{ success: boolean; error?: string }> => {
    const response = await apiFetch('/api/mobile/auth', {
      method: 'POST',
      body: JSON.stringify({ phone: phone.trim(), password, action, role, otpCode }),
    });

    if (!response) {
      return { success: false, error: 'Network error. Please try again.' };
    }

    if (!response.success) {
      return { success: false, error: response.error || 'Authentication aborted.' };
    }

    if (response.token) await authStorage.saveToken(response.token);
    if (response.userId) await authStorage.saveUserId(response.userId);
    if (response.userType) await authStorage.saveUserRole(response.userType);
    if (response.schoolId) await authStorage.saveSchoolId(response.schoolId);
    
    if (response.students) {
      await AsyncStorage.setItem(STUDENTS_CACHE_KEY, JSON.stringify(response.students));
    }
    
    return { success: true };
  },

  sendOTP: async (phone: string, role: string): Promise<{ success: boolean; error?: string; demoCode?: string }> => {
    const response = await apiFetch('/api/mobile/auth', {
      method: 'POST',
      body: JSON.stringify({ phone: phone.trim(), action: 'send_otp', role }),
    });
    if (!response || !response.success) {
      return { success: false, error: response?.error || 'Failed to send verification code.' };
    }
    return { success: true, demoCode: response.demoCode };
  },

  verifyOTP: async (phone: string, otpCode: string, role: string): Promise<{ success: boolean; error?: string }> => {
    const response = await apiFetch('/api/mobile/auth', {
      method: 'POST',
      body: JSON.stringify({ phone: phone.trim(), otpCode, action: 'verify_otp', role }),
    });
    if (!response || !response.success) {
      return { success: false, error: response?.error || 'Invalid verification code.' };
    }
    return { success: true };
  },

  resetPassword: async (phone: string, otpCode: string, newPassword: string, role: string): Promise<{ success: boolean; error?: string }> => {
    const response = await apiFetch('/api/mobile/auth', {
      method: 'POST',
      body: JSON.stringify({ phone: phone.trim(), otpCode, password: newPassword, action: 'reset_password', role }),
    });
    if (!response || !response.success) {
      return { success: false, error: response?.error || 'Failed to reset password.' };
    }
    if (response.token) await authStorage.saveToken(response.token);
    if (response.userId) await authStorage.saveUserId(response.userId);
    if (response.userType) await authStorage.saveUserRole(response.userType);
    if (response.schoolId) await authStorage.saveSchoolId(response.schoolId);
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
    return authStorage.isLoggedIn();
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
    if (!data || !Array.isArray(data)) return [];

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
    holidayName?: string | null;
    resources?: any[];
    homeworkDue?: any[];
    homeworkGiven?: any[];
    files?: any[];
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
      holidayName: home.holidayName || undefined,
      sessions: (home.sessions || []).map((s: any, i: number) => ({
        id: s.id || i,
        subject: s.subject,
        room: s.room,
        startTime: s.startTime,
        endTime: s.endTime,
        time: `${s.startTime} - ${s.endTime}`,
        attendance: s.attendance,
        score: s.score || 0,
        teacher: s.teacher,
        iconName: 'Book',
        color: '#0055d4',
      })),
      notes: (home.teacherRemarks || []).map((r: any) => {
        let timeString = r.time || '';
        if (!timeString && r.date) {
           const d = new Date(r.date);
           timeString = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        return {
          id: r.id,
          text: r.note,
          subject: r.subject,
          author: r.teacher || 'Teacher',
          time: timeString
        };
      }),
      files: (home.resources || []).flatMap((r: any) => {
        const urls = r.url ? r.url.split(',') : [];
        return urls.map((url: string, index: number) => ({
          id: `${r.id}-${index}`,
          name: urls.length > 1 ? `${r.title} (${index + 1})` : r.title,
          url: url,
          sharedBy: r.teacher,
          subject: r.subject || 'Material',
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
    const data = await apiFetch(`/api/mobile/courses?studentId=${studentId}`);
    return Array.isArray(data) ? data : [];
  },

  fetchPayments: async (studentId: string, forceRefresh = false): Promise<PaymentRecord[]> => {
    // Fetch payments directly from the new backend API endpoint
    const data = await apiFetch(`/api/mobile/payments?studentId=${studentId}`);
    const payments = Array.isArray(data) ? data : [];

    const MONTH_NAMES = [
      '', 'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];

    const today = new Date();
    const currentMonthIndex = today.getMonth();
    const currentMonth = currentMonthIndex + 1;
    const currentYear = today.getFullYear();

    // If we are in July (6) or later, the school year starts this year. Otherwise, it started last year.
    const schoolYearStartYear = (currentMonthIndex >= 6) ? currentYear : currentYear - 1;

    // Define the academic cycle: Sep (9) to Jun (6)
    const academicMonths = [
      { month: 9, year: schoolYearStartYear },
      { month: 10, year: schoolYearStartYear },
      { month: 11, year: schoolYearStartYear },
      { month: 12, year: schoolYearStartYear },
      { month: 1, year: schoolYearStartYear + 1 },
      { month: 2, year: schoolYearStartYear + 1 },
      { month: 3, year: schoolYearStartYear + 1 },
      { month: 4, year: schoolYearStartYear + 1 },
      { month: 5, year: schoolYearStartYear + 1 },
      { month: 6, year: schoolYearStartYear + 1 },
    ];

    // Fetch student data from cache to get tuition fee, fallback to 120
    const students: any[] = JSON.parse(await AsyncStorage.getItem(STUDENTS_CACHE_KEY) || '[]');
    const s = students.find((x) => x.id === studentId);
    const tuitionFee = s?.class?.level?.tuitionFee || 120;

    const timeline: PaymentRecord[] = academicMonths.map((cycle, index) => {
      // Look for a payment record for this specific month/year
      const p = payments.find((x: any) => x.month === cycle.month && x.year === cycle.year);
      
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

        const isActuallyPaid = p.status === 'PAID' || p.status === 'PARTIAL';
        return {
          id: p.id,
          month: `${MONTH_NAMES[cycle.month]} ${cycle.year}`,
          totalAmount: tuitionFee, // Always use the current real tuition fee
          paidAmount: p.status === 'PAID' ? Math.max(p.amount, tuitionFee) : (isActuallyPaid ? p.amount : 0),
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
          totalAmount: tuitionFee, // Real tuition fee from backend
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
      className: n.className || 'School',
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
    
    return data.map((item: any) => {
      const rawImg = item.rawImg !== undefined ? item.rawImg : (item.img || item.image || '');
      let images: string[] = [];
      if (rawImg && typeof rawImg === 'string') {
        images = rawImg.split(',').map((url: string) => getFullImageUrl(url)).filter(Boolean) as string[];
      }
      
      return {
        ...item,
        images,
        image: images.length > 0 ? images[0] : (item.image || 'https://ui-avatars.com/api/?name=Announcement&background=0055d4&color=fff&size=512'),
      };
    });
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

  updateProfile: async (studentId: string, data: { name?: string; surname?: string }) => {
    return apiFetch('/api/mobile/students', {
      method: 'PATCH',
      body: JSON.stringify({ id: studentId, ...data }),
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

  checkTaskStatus: async (studentId: string, assignmentId: number): Promise<{isCompleted: boolean, img?: string | null}> => {
    try {
      const data = await apiFetch(`/api/mobile/tasks/submit?studentId=${studentId}&assignmentId=${assignmentId}`);
      return { isCompleted: data?.isCompleted === true, img: data?.img };
    } catch {
      return { isCompleted: false, img: null };
    }
  },

  submitTask: async (studentId: string, assignmentId: number, imageUrl?: string) => {
    return apiFetch('/api/mobile/tasks/submit', {
      method: 'POST',
      body: JSON.stringify({ studentId, assignmentId, imageUrl }),
    });
  },
};

export const uiService = {
  uploadImage: async (uri: string, type: 'profile' | 'student', id: string, onProgress?: (event: ProgressEvent) => void) => {
    return new Promise(async (resolve) => {
      try {
        const formData = new FormData();
        
        const uriParts = uri.split('.');
        const fileType = uriParts[uriParts.length - 1];

        formData.append('file', {
          uri,
          name: `photo.${fileType}`,
          type: `image/${fileType}`,
        } as any);
        
        formData.append('type', type);
        formData.append('id', id);

        const schoolId = await authStorage.getSchoolId();
        const token = await authStorage.getToken();
        
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${API_BASE_URL}/api/mobile/upload`);
        xhr.setRequestHeader('x-school-id', schoolId || 'default_school');
        if (token) {
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }

        if (onProgress) {
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              onProgress(event);
            }
          };
        }

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve(response);
            } catch (e) {
              resolve({ success: false, error: 'Failed to parse response' });
            }
          } else {
            resolve({ success: false, error: 'Upload failed' });
          }
        };

        xhr.onerror = () => {
          console.warn('Upload failed (XHR onerror)');
          resolve({ success: false, error: 'Upload failed' });
        };

        xhr.ontimeout = () => {
          console.warn('Upload timed out');
          resolve({ success: false, error: 'Upload timed out' });
        };
        
        xhr.timeout = 30000; // 30 second timeout

        xhr.send(formData);
      } catch (error) {
        console.warn('Upload setup failed:', error);
        resolve({ success: false, error: 'Upload setup failed' });
      }
    });
  },
};

// ─── Teacher Service ────────────────────────────────────────────────────────────
export const teacherService = {
  fetchProfile: async () => {
    const id = await authStorage.getUserId();
    if (!id) return null;
    return apiFetch(`/api/mobile/teacher?id=${id}`);
  },

  updateProfile: async (data: { name?: string; surname?: string; phone?: string; img?: string }) => {
    const id = await authStorage.getUserId();
    if (!id) return null;
    return apiFetch('/api/mobile/teacher', {
      method: 'PUT',
      body: JSON.stringify({ id, ...data }),
    });
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

  fetchClassStudents: async (classId: string, date?: string, slotId?: number) => {
    const teacherId = await authStorage.getUserId();
    let url = `/api/mobile/teacher/students?classId=${classId}&teacherId=${teacherId}`;
    if (date) url += `&date=${date}`;
    if (slotId) url += `&slotId=${slotId}`;
    return apiFetch(url);
  },

  saveAttendance: async (data: { 
    classId: string; 
    date: string; 
    records: { studentId: string; status: string; note?: string; score?: number }[];
    lessonId: number | null;
    slotId?: number | null;
    subjectId?: number | null;
    task?: { title: string; description?: string; attachments?: any[] };
    resource?: { title: string; url: string };
  }) => {
    const teacherId = await authStorage.getUserId();
    const result = await apiFetch('/api/mobile/teacher/attendance', {
      method: "POST",
      body: JSON.stringify({ ...data, teacherId }),
    });
    if (!result) throw new Error("Failed to save attendance");
    return result;
  },

  saveLesson: async (lessonData: any) => {
    return apiFetch('/api/mobile/teacher/lessons', {
      method: 'POST',
      body: JSON.stringify(lessonData),
    });
  },

  createTask: async (data: { title: string; description?: string; classId: string; attachments?: any[]; dueDate?: string | null }) => {
    const teacherId = await authStorage.getUserId();
    return apiFetch('/api/mobile/teacher/tasks', {
      method: 'POST',
      body: JSON.stringify({ ...data, teacherId }),
    });
  },

  fetchTaskSubmissions: async (assignmentId: number) => {
    return apiFetch(`/api/mobile/teacher/task-submissions?assignmentId=${assignmentId}`);
  },

  fetchTasks: async () => {
    const teacherId = await authStorage.getUserId();
    return apiFetch(`/api/mobile/teacher/tasks?teacherId=${teacherId}`);
  },

  fetchResources: async (classId: string) => {
    const teacherId = await authStorage.getUserId();
    return apiFetch(`/api/mobile/teacher/resources?classId=${classId}&teacherId=${teacherId}`);
  },

  uploadResource: async (data: { classId: string; subjectId?: string; title: string; description?: string; url: string }) => {
    const teacherId = await authStorage.getUserId();
    return apiFetch('/api/mobile/teacher/resources', {
      method: 'POST',
      body: JSON.stringify({ ...data, teacherId }),
    });
  },

  fetchSubjectsForClass: async (teacherId: string, classId: number) => {
    const data = await apiFetch(`/api/mobile/teacher/subjects?teacherId=${teacherId}&classId=${classId}`);
    return Array.isArray(data) ? data : [];
  },

  fetchGradesData: async (teacherId: string, classId: number, term: number) => {
    const data = await apiFetch(`/api/mobile/teacher/grades?teacherId=${teacherId}&classId=${classId}&term=${term}`);
    return data || { students: [], subjects: [] };
  },

  submitGrades: async (teacherId: string, classId: number, subjectId: number, term: number, grades: { studentId: string; score: number | null }[], proofUrl?: string) => {
    const data = await apiFetch('/api/mobile/teacher/grades', {
      method: 'POST',
      body: JSON.stringify({ teacherId, classId, subjectId, term, grades, proofUrl }),
    });
    return data;
  },
};
