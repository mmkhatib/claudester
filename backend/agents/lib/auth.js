"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PERMISSIONS = void 0;
exports.getCurrentDBUser = getCurrentDBUser;
exports.hasPermission = hasPermission;
exports.requirePermission = requirePermission;
exports.hasRole = hasRole;
exports.hasAnyRole = hasAnyRole;
exports.syncUserFromClerk = syncUserFromClerk;
exports.getUserByClerkId = getUserByClerkId;
exports.updateUserRole = updateUserRole;
const server_1 = require("@clerk/nextjs/server");
const models_1 = require("@/backend/models");
const mongodb_1 = require("./mongodb");
// RBAC permission definitions
exports.PERMISSIONS = {
    // Project permissions
    PROJECT_CREATE: [models_1.UserRole.ADMIN, models_1.UserRole.PM],
    PROJECT_UPDATE: [models_1.UserRole.ADMIN, models_1.UserRole.PM],
    PROJECT_DELETE: [models_1.UserRole.ADMIN],
    PROJECT_VIEW: [models_1.UserRole.ADMIN, models_1.UserRole.PM, models_1.UserRole.STAKEHOLDER, models_1.UserRole.DEVELOPER, models_1.UserRole.VIEWER],
    // Spec permissions
    SPEC_CREATE: [models_1.UserRole.ADMIN, models_1.UserRole.PM, models_1.UserRole.STAKEHOLDER],
    SPEC_UPDATE: [models_1.UserRole.ADMIN, models_1.UserRole.PM, models_1.UserRole.STAKEHOLDER],
    SPEC_APPROVE: [models_1.UserRole.ADMIN, models_1.UserRole.PM],
    SPEC_DELETE: [models_1.UserRole.ADMIN, models_1.UserRole.PM],
    SPEC_VIEW: [models_1.UserRole.ADMIN, models_1.UserRole.PM, models_1.UserRole.STAKEHOLDER, models_1.UserRole.DEVELOPER, models_1.UserRole.VIEWER],
    // Task permissions
    TASK_CREATE: [models_1.UserRole.ADMIN, models_1.UserRole.PM],
    TASK_UPDATE: [models_1.UserRole.ADMIN, models_1.UserRole.PM, models_1.UserRole.DEVELOPER],
    TASK_ASSIGN: [models_1.UserRole.ADMIN, models_1.UserRole.PM],
    TASK_DELETE: [models_1.UserRole.ADMIN, models_1.UserRole.PM],
    TASK_VIEW: [models_1.UserRole.ADMIN, models_1.UserRole.PM, models_1.UserRole.STAKEHOLDER, models_1.UserRole.DEVELOPER, models_1.UserRole.VIEWER],
    // Agent permissions
    AGENT_START: [models_1.UserRole.ADMIN, models_1.UserRole.PM, models_1.UserRole.DEVELOPER],
    AGENT_STOP: [models_1.UserRole.ADMIN, models_1.UserRole.PM, models_1.UserRole.DEVELOPER],
    AGENT_VIEW: [models_1.UserRole.ADMIN, models_1.UserRole.PM, models_1.UserRole.DEVELOPER, models_1.UserRole.VIEWER],
    // Comment permissions
    COMMENT_CREATE: [models_1.UserRole.ADMIN, models_1.UserRole.PM, models_1.UserRole.STAKEHOLDER, models_1.UserRole.DEVELOPER],
    COMMENT_UPDATE: [models_1.UserRole.ADMIN, models_1.UserRole.PM, models_1.UserRole.STAKEHOLDER, models_1.UserRole.DEVELOPER],
    COMMENT_DELETE: [models_1.UserRole.ADMIN, models_1.UserRole.PM],
    // Admin permissions
    USER_MANAGE: [models_1.UserRole.ADMIN],
    SYSTEM_CONFIG: [models_1.UserRole.ADMIN],
};
/**
 * Get the current authenticated user from the database
 */
async function getCurrentDBUser() {
    const { userId } = (0, server_1.auth)();
    if (!userId) {
        return null;
    }
    await (0, mongodb_1.connectDB)();
    const user = await models_1.User.findOne({ clerkId: userId });
    return user;
}
/**
 * Check if the current user has a specific permission
 */
async function hasPermission(permission) {
    const user = await getCurrentDBUser();
    if (!user) {
        return false;
    }
    const allowedRoles = exports.PERMISSIONS[permission];
    return allowedRoles.includes(user.role);
}
/**
 * Require a specific permission or throw an error
 */
async function requirePermission(permission) {
    const user = await getCurrentDBUser();
    if (!user) {
        throw new Error('Unauthorized: User not authenticated');
    }
    const allowedRoles = exports.PERMISSIONS[permission];
    if (!allowedRoles.includes(user.role)) {
        throw new Error(`Forbidden: ${permission} permission required`);
    }
    return user;
}
/**
 * Check if user has a specific role
 */
async function hasRole(role) {
    const user = await getCurrentDBUser();
    return user?.role === role;
}
/**
 * Check if user has any of the specified roles
 */
async function hasAnyRole(roles) {
    const user = await getCurrentDBUser();
    return user ? roles.includes(user.role) : false;
}
/**
 * Sync Clerk user to MongoDB
 */
async function syncUserFromClerk() {
    const clerkUser = await (0, server_1.currentUser)();
    if (!clerkUser) {
        return null;
    }
    await (0, mongodb_1.connectDB)();
    // Find or create user
    let user = await models_1.User.findOne({ clerkId: clerkUser.id });
    const email = clerkUser.emailAddresses[0]?.emailAddress;
    const name = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || email;
    if (!user) {
        // Create new user with default VIEWER role
        user = await models_1.User.create({
            clerkId: clerkUser.id,
            email,
            name,
            role: models_1.UserRole.VIEWER,
            avatar: clerkUser.imageUrl,
        });
        console.log(`Created new user: ${user.email} with role ${user.role}`);
    }
    else {
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
async function getUserByClerkId(clerkId) {
    await (0, mongodb_1.connectDB)();
    return models_1.User.findOne({ clerkId });
}
/**
 * Update user role (admin only)
 */
async function updateUserRole(userId, newRole) {
    await requirePermission('USER_MANAGE');
    await (0, mongodb_1.connectDB)();
    const user = await models_1.User.findById(userId);
    if (!user) {
        throw new Error('User not found');
    }
    user.role = newRole;
    await user.save();
    console.log(`Updated user ${user.email} role to ${newRole}`);
    return user;
}
