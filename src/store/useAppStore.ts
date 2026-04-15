import { create } from 'zustand';
import { Student } from '../types';

interface AppState {
  children: Student[];
  parentName: string;
  parentAvatarUrl: string | null;
  selectedChildId: string | null;
  isLoading: boolean;
  error: string | null;
  setChildren: (children: Student[]) => void;
  setParentName: (name: string) => void;
  setParentAvatarUrl: (url: string | null) => void;
  setSelectedChildId: (id: string) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  getSelectedChild: () => Student | undefined;
}
export const useAppStore = create<AppState>((set, get) => ({
  children: [],
  parentName: 'Parent',
  parentAvatarUrl: null,
  selectedChildId: null,
  isLoading: false,
  error: null,
  setChildren: (children) => set({ children }),
  setParentName: (parentName) => set({ parentName }),
  setParentAvatarUrl: (parentAvatarUrl) => set({ parentAvatarUrl }),
  setSelectedChildId: (selectedChildId) => set({ selectedChildId }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  getSelectedChild: () => {
    const { children, selectedChildId } = get();
    return children.find((c) => c.id === selectedChildId);
  },
}));
