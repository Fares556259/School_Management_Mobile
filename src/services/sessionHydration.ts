import { adminService, parentService, teacherService } from './api';

export type SessionRole = 'parent' | 'teacher' | 'admin';

type SessionServices = {
  parentProfile: () => Promise<any>;
  parentChildren: () => Promise<any[]>;
  teacherProfile: () => Promise<any>;
  adminProfile: () => Promise<any>;
};

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
