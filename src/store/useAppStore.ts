import { create } from 'zustand';
import { Student } from '../types';

interface AppState {
  children: Student[];
  userRole: 'parent' | 'teacher' | null;
  userId: string | null;
  userName: string;
  userAvatarUrl: string | null;
  selectedChildId: string | null;
  isLoading: boolean;
  error: string | null;
  unreadNotificationsCount: number;
  studentStatuses: Record<string, 'Present' | 'Absent' | 'Due'>;
  selectedTeacherClass: any | null;
  setChildren: (children: Student[]) => void;
  setUserRole: (role: 'parent' | 'teacher' | null) => void;
  setUserId: (id: string | null) => void;
  setUserName: (name: string) => void;
  setUserAvatarUrl: (url: string | null) => void;
  setSelectedChildId: (id: string) => void;
  setUnreadNotificationsCount: (count: number) => void;
  setStudentStatus: (childId: string, status: 'Present' | 'Absent' | 'Due') => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  setSelectedTeacherClass: (cls: any) => void;
  getSelectedChild: () => Student | undefined;
}
export const useAppStore = create<AppState>((set, get) => ({
  children: [],
  userRole: null,
  userId: null,
  userName: 'User',
  userAvatarUrl: null,
  selectedChildId: null,
  unreadNotificationsCount: 0,
  studentStatuses: {},
  selectedTeacherClass: null,
  isLoading: false,
  error: null,
  setChildren: (children) => set({ children }),
  setUserRole: (userRole) => set({ userRole }),
  setUserId: (userId) => set({ userId }),
  setUserName: (userName) => set({ userName }),
  setUserAvatarUrl: (userAvatarUrl) => set({ userAvatarUrl }),
  setSelectedChildId: (selectedChildId) => set({ selectedChildId }),
  setUnreadNotificationsCount: (unreadNotificationsCount) => set({ unreadNotificationsCount }),
  setStudentStatus: (childId, status) => set((state) => ({ 
    studentStatuses: { ...state.studentStatuses, [childId]: status } 
    })),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setSelectedTeacherClass: (selectedTeacherClass) => set({ selectedTeacherClass }),
  getSelectedChild: () => {
    const { children, selectedChildId } = get();
    return children.find((c) => c.id === selectedChildId);
  },
}));
