import { auth, currentUser } from '@clerk/nextjs/server';
import { User, UserRole, type IUser } from '@/backend/models';
import { connectDB } from './mongodb';

// RBAC permission definitions
export const PERMISSIONS = {
  // Project permissions
  PROJECT_CREATE: [UserRole.ADMIN, UserRole.PM],
  PROJECT_UPDATE: [UserRole.ADMIN, UserRole.PM],
  PROJECT_DELETE: [UserRole.ADMIN],
  PROJECT_VIEW: [UserRole.ADMIN, UserRole.PM, UserRole.STAKEHOLDER, UserRole.DEVELOPER, UserRole.VIEWER],

  // Spec permissions
  SPEC_CREATE: [UserRole.ADMIN, UserRole.PM, UserRole.STAKEHOLDER],
  SPEC_UPDATE: [UserRole.ADMIN, UserRole.PM, UserRole.STAKEHOLDER],
  SPEC_APPROVE: [UserRole.ADMIN, UserRole.PM],
  SPEC_DELETE: [UserRole.ADMIN, UserRole.PM],
  SPEC_VIEW: [UserRole.ADMIN, UserRole.PM, UserRole.STAKEHOLDER, UserRole.DEVELOPER, UserRole.VIEWER],

  // Task permissions
  TASK_CREATE: [UserRole.ADMIN, UserRole.PM],
  TASK_UPDATE: [UserRole.ADMIN, UserRole.PM, UserRole.DEVELOPER],
  TASK_ASSIGN: [UserRole.ADMIN, UserRole.PM],
  TASK_DELETE: [UserRole.ADMIN, UserRole.PM],
  TASK_VIEW: [UserRole.ADMIN, UserRole.PM, UserRole.STAKEHOLDER, UserRole.DEVELOPER, UserRole.VIEWER],

  // Agent permissions
  AGENT_START: [UserRole.ADMIN, UserRole.PM, UserRole.DEVELOPER],
  AGENT_STOP: [UserRole.ADMIN, UserRole.PM, UserRole.DEVELOPER],
  AGENT_VIEW: [UserRole.ADMIN, UserRole.PM, UserRole.DEVELOPER, UserRole.VIEWER],

  // Comment permissions
  COMMENT_CREATE: [UserRole.ADMIN, UserRole.PM, UserRole.STAKEHOLDER, UserRole.DEVELOPER],
  COMMENT_UPDATE: [UserRole.ADMIN, UserRole.PM, UserRole.STAKEHOLDER, UserRole.DEVELOPER],
  COMMENT_DELETE: [UserRole.ADMIN, UserRole.PM],

  // Admin permissions
  USER_MANAGE: [UserRole.ADMIN],
  SYSTEM_CONFIG: [UserRole.ADMIN],
} as const;

export type Permission = keyof typeof PERMISSIONS;

/**
 * Get the current authenticated user from the database
 */
export async function getCurrentDBUser(): Promise<IUser | null> {
  const { userId } = auth();

  if (!userId) {
    return null;
  }

  await connectDB();

  const user = await User.findOne({ clerkId: userId });
  return user;
}

/**
 * Check if the current user has a specific permission
 */
export async function hasPermission(permission: Permission): Promise<boolean> {
  const user = await getCurrentDBUser();

  if (!user) {
    return false;
  }

  const allowedRoles = PERMISSIONS[permission] as readonly UserRole[];
  return allowedRoles.includes(user.role);
}

/**
 * Require a specific permission or throw an error
 */
export async function requirePermission(permission: Permission): Promise<IUser> {
  const user = await getCurrentDBUser();

  if (!user) {
    throw new Error('Unauthorized: User not authenticated');
  }

  const allowedRoles = PERMISSIONS[permission] as readonly UserRole[];
  if (!allowedRoles.includes(user.role)) {
    throw new Error(`Forbidden: ${permission} permission required`);
  }

  return user;
}

/**
 * Check if user has a specific role
 */
export async function hasRole(role: UserRole): Promise<boolean> {
  const user = await getCurrentDBUser();
  return user?.role === role;
}

/**
 * Check if user has any of the specified roles
 */
export async function hasAnyRole(roles: UserRole[]): Promise<boolean> {
  const user = await getCurrentDBUser();
  return user ? roles.includes(user.role) : false;
}

/**
 * Sync Clerk user to MongoDB
 */
export async function syncUserFromClerk(): Promise<IUser | null> {
  const clerkUser = await currentUser();

  if (!clerkUser) {
    return null;
  }

  await connectDB();

  // Find or create user
  let user = await User.findOne({ clerkId: clerkUser.id });

  const email = clerkUser.emailAddresses[0]?.emailAddress;
  const name = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || email;

  if (!user) {
    // Create new user with default VIEWER role
    user = await User.create({
      clerkId: clerkUser.id,
      email,
      name,
      role: UserRole.VIEWER,
      avatar: clerkUser.imageUrl,
    });

    console.log(`Created new user: ${user.email} with role ${user.role}`);
  } else {
    // Update existing user info
    let updated = false;

    if (user.email !== email) {
      user.email = email;
      updated = true;
    }

    if (user.name !== name) {
      user.name = name;
      updated = true;
    }

    if (user.avatar !== clerkUser.imageUrl) {
      user.avatar = clerkUser.imageUrl;
      updated = true;
    }

    if (updated) {
      await user.save();
    }
  }

  return user;
}

/**
 * Get user by Clerk ID
 */
export async function getUserByClerkId(clerkId: string): Promise<IUser | null> {
  await connectDB();
  return User.findOne({ clerkId });
}

/**
 * Update user role (admin only)
 */
export async function updateUserRole(userId: string, newRole: UserRole): Promise<IUser> {
  await requirePermission('USER_MANAGE');
  await connectDB();

  const user = await User.findById(userId);

  if (!user) {
    throw new Error('User not found');
  }

  user.role = newRole;
  await user.save();

  console.log(`Updated user ${user.email} role to ${newRole}`);

  return user;
}
