import { User } from "firebase/auth";
import { UserProfile, UserRole } from "../types";

/**
 * Mahfil Permission Matrix
 * Centralized logic for access control across the application.
 */

export interface PermissionState {
  canEditMenu: boolean;
  canManageUsers: boolean;
  canViewLogs: boolean;
  canAccessAiConfig: boolean;
  canProcessOrders: boolean;
  canCallWaiters: boolean;
}

export const SUPER_ADMIN_EMAIL = "usamakhn694@gmail.com";

export function getPermissions(user: User | null, profile: UserProfile | null): PermissionState {
  const isSuperAdmin = user?.email === SUPER_ADMIN_EMAIL && user?.emailVerified;
  const role = profile?.role || UserRole.USER;
  const isAdmin = role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN || isSuperAdmin;

  return {
    canEditMenu: isAdmin || role === UserRole.MANAGER,
    canManageUsers: isAdmin,
    canViewLogs: isAdmin,
    canAccessAiConfig: isSuperAdmin,
    canProcessOrders: isAdmin || role === UserRole.MANAGER || role === UserRole.WAITER || role === UserRole.CHEF,
    canCallWaiters: !!user,
  };
}

export function isUserAdmin(user: User | null, profile: UserProfile | null): boolean {
  if (!user) return false;
  if (user.email === SUPER_ADMIN_EMAIL && user.emailVerified) return true;
  return profile?.role === UserRole.ADMIN || profile?.role === UserRole.SUPER_ADMIN || !!profile?.isAdmin;
}
