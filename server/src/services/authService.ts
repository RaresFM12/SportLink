import { createHash } from 'crypto';
import { prisma } from '../lib/prisma.js';
import { HttpError } from '../utils/httpErrors.js';

export type SessionUser = {
  id: number;
  username: string;
  displayName: string;
  role: 'ADMIN' | 'USER';
  permissions: string[];
};

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

export const authService = {
  async login(username: string, password: string): Promise<SessionUser> {
    if (!username || !password) {
      throw new HttpError(400, 'Username and password are required.');
    }

    const user = await prisma.user.findUnique({
      where: { username: username.trim().toLowerCase() },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
      },
    });

    if (!user) throw new HttpError(401, 'Invalid username or password.');

    const hash = hashPassword(password);
    if (hash !== user.passwordHash) {
      throw new HttpError(401, 'Invalid username or password.');
    }

    // In practice users have one role; take the first one
    const userRole = user.userRoles[0];
    if (!userRole) throw new HttpError(403, 'User has no role assigned.');

    const roleName = userRole.role.name as 'ADMIN' | 'USER';
    const permissions = userRole.role.rolePermissions.map((rp) => rp.permission.action);

    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: roleName,
      permissions,
    };
  },

  async getUserById(id: number): Promise<SessionUser | null> {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: { include: { permission: true } },
              },
            },
          },
        },
      },
    });

    if (!user) return null;

    const userRole = user.userRoles[0];
    if (!userRole) return null;

    const roleName = userRole.role.name as 'ADMIN' | 'USER';
    const permissions = userRole.role.rolePermissions.map((rp) => rp.permission.action);

    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: roleName,
      permissions,
    };
  },

  async getAllUsers(): Promise<SessionUser[]> {
    const users = await prisma.user.findMany({
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: { include: { permission: true } },
              },
            },
          },
        },
      },
    });

    return users.map((user) => {
      const userRole = user.userRoles[0];
      return {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: (userRole?.role.name ?? 'USER') as 'ADMIN' | 'USER',
        permissions: userRole?.role.rolePermissions.map((rp) => rp.permission.action) ?? [],
      };
    });
  },

  hasPermission(user: SessionUser, action: string): boolean {
    return user.permissions.includes(action);
  },
};
