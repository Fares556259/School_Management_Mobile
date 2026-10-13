import AsyncStorage from '@react-native-async-storage/async-storage';
import { adminService, parentService, teacherService } from './api';

export type SessionRole = 'parent' | 'teacher' | 'admin';

type SessionServices = {
  parentProfile: () => Promise<any>;
  parentChildren: () => Promise<any[]>;
  teacherProfile: () => Promise<any>;
  adminProfile: () => Promise<any>;
};

const selectedChildKey = (userId: string) => `@snapschool_selected_child:${userId}`;

export async function loadPreferredChildId(userId: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(selectedChildKey(userId));
  } catch {
    return null;
  }
}

export async function savePreferredChildId(userId: string | null, childId: string): Promise<void> {
  if (!userId) return;
  try {
    await AsyncStorage.setItem(selectedChildKey(userId), childId);
  } catch {}
}

const defaultServices: SessionServices = {
  parentProfile: parentService.fetchParentProfile,
  parentChildren: parentService.fetchChildren,
  teacherProfile: teacherService.fetchProfile,
  adminProfile: adminService.fetchProfile,
};

export type SessionSnapshot = {
  role: SessionRole;
  profile: any | null;
  children: any[];
};

/** Profile data improves the signed-in screen, but must never block app launch. */
export async function loadSessionSnapshot(
  role: SessionRole,
  services: SessionServices = defaultServices
): Promise<SessionSnapshot> {
  if (role === 'parent') {
    const [profile, children] = await Promise.all([
      services.parentProfile().catch(() => null),
      services.parentChildren().catch(() => []),
    ]);
    return { role, profile, children: Array.isArray(children) ? children : [] };
  }

  const profile = role === 'teacher'
    ? await services.teacherProfile().catch(() => null)
    : await services.adminProfile().catch(() => null);
  return { role, profile, children: [] };
}

/** Device-only parent hydration used before any API request on cold launch. */
export async function loadCachedParentChildren(): Promise<any[]> {
  try {
    return await parentService.fetchCachedChildren();
  } catch {
    return [];
  }
}
