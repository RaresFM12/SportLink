import { createHash, randomBytes } from 'crypto';
import { prisma } from '../lib/prisma.js';
import { HttpError } from '../utils/httpErrors.js';

export type SessionUser = {
  id: number;
  username: string;
  displayName: string;
  role: 'ADMIN' | 'USER';
  permissions: string[];
};

export type RegisterInput = {
  username: string;
  displayName: string;
  password: string;
};

const DEFAULT_PERMISSIONS = [
  'event:read',
  'event:create',
  'event:update',
  'event:update:own',
  'event:delete',
  'event:delete:own',
  'event:join',
  'event:leave',
  'comment:create',
  'comment:update',
  'comment:delete',
  'generator:start',
  'generator:stop',
  'user:manage',
  'statistics:read',
  'chat:read',
  'chat:write',
] as const;

const USER_PERMISSIONS = [
  'event:read',
  'event:create',
  'event:update:own',
  'event:delete:own',
  'event:join',
  'event:leave',
  'comment:create',
  'comment:update',
  'comment:delete',
  'statistics:read',
  'chat:read',
  'chat:write',
] as const;

const PASSWORD_RESET_TTL_MS = Number(process.env.PASSWORD_RESET_TTL_MS ?? 1000 * 60 * 30);

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

function hashResetToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

async function ensureAuthDefaults(): Promise<void> {
  const [adminRole, userRole] = await Promise.all([
    prisma.role.upsert({
      where: { name: 'ADMIN' },
      update: {},
      create: { name: 'ADMIN', description: 'Full access to all resources' },
    }),
    prisma.role.upsert({
      where: { name: 'USER' },
      update: {},
      create: { name: 'USER', description: 'Standard user access' },
    }),
  ]);

  const permissions = await Promise.all(
    DEFAULT_PERMISSIONS.map((action) =>
      prisma.permission.upsert({
        where: { action },
        update: {},
        create: { action },
      })
    )
  );
  const permissionByAction = Object.fromEntries(permissions.map((p) => [p.action, p]));

  await Promise.all([
    ...permissions.map((permission) =>
      prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: adminRole.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: adminRole.id,
          permissionId: permission.id,
        },
      })
    ),
    ...USER_PERMISSIONS.map((action) =>
      prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: userRole.id,
            permissionId: permissionByAction[action].id,
          },
        },
        update: {},
        create: {
          roleId: userRole.id,
          permissionId: permissionByAction[action].id,
        },
      })
    ),
  ]);
}

export const authService = {
  async register(input: RegisterInput): Promise<SessionUser> {
    await ensureAuthDefaults();

    const username = input.username.trim().toLowerCase();
    const displayName = input.displayName.trim();
    const password = input.password;

    if (!username || !displayName || !password) {
      throw new HttpError(400, 'Username, full name, and password are required.');
    }

    if (username.length < 3) {
      throw new HttpError(400, 'Username must be at least 3 characters.');
    }

    if (password.length < 6) {
      throw new HttpError(400, 'Password must be at least 6 characters.');
    }

    const existingUser = await prisma.user.findUnique({ where: { username } });
    if (existingUser) {
      throw new HttpError(409, 'Username is already taken.');
    }

    const userRole = await prisma.role.findUnique({ where: { name: 'USER' } });
    if (!userRole) {
      throw new HttpError(500, 'Default USER role is missing.');
    }

    const user = await prisma.user.create({
      data: {
        username,
        displayName,
        passwordHash: hashPassword(password),
        userRoles: {
          create: {
            roleId: userRole.id,
          },
        },
      },
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

    const role = user.userRoles[0];
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: (role?.role.name ?? 'USER') as 'USER',
      permissions: role?.role.rolePermissions.map((rp) => rp.permission.action) ?? [],
    };
  },

  async login(username: string, password: string): Promise<SessionUser> {
    await ensureAuthDefaults();

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

  async requestPasswordReset(username: string): Promise<{ resetToken?: string; expiresAt?: Date }> {
    await ensureAuthDefaults();

    const normalizedUsername = username.trim().toLowerCase();
    if (!normalizedUsername) {
      throw new HttpError(400, 'Username is required.');
    }

    const user = await prisma.user.findUnique({ where: { username: normalizedUsername } });
    if (!user) {
      return {};
    }

    await prisma.passwordResetToken.updateMany({
      where: {
        userId: user.id,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { usedAt: new Date() },
    });

    const resetToken = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashResetToken(resetToken),
        expiresAt,
      },
    });

    return { resetToken, expiresAt };
  },

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const resetToken = token.trim();
    if (!resetToken || !newPassword) {
      throw new HttpError(400, 'Reset token and new password are required.');
    }

    if (newPassword.length < 6) {
      throw new HttpError(400, 'Password must be at least 6 characters.');
    }

    const tokenHash = hashResetToken(resetToken);
    const storedToken = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (!storedToken || storedToken.usedAt || storedToken.expiresAt <= new Date()) {
      throw new HttpError(400, 'Reset token is invalid or expired.');
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: storedToken.userId },
        data: { passwordHash: hashPassword(newPassword) },
      }),
      prisma.passwordResetToken.update({
        where: { id: storedToken.id },
        data: { usedAt: new Date() },
      }),
    ]);
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
