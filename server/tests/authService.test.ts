/// <reference types="vitest/globals" />
import { describe, it, expect } from 'vitest';
import { prisma } from '../src/lib/prisma.js';
import { authService } from '../src/services/authService.js';
import { createHash } from 'crypto';

function hashPassword(p: string) {
  return createHash('sha256').update(p).digest('hex');
}

async function seedRolesAndUsers() {
  const adminRole = await prisma.role.create({
    data: { name: 'ADMIN', description: 'Full access' },
  });
  const userRole = await prisma.role.create({
    data: { name: 'USER', description: 'Standard access' },
  });

  const readPerm = await prisma.permission.create({ data: { action: 'event:read' } });
  const deletePerm = await prisma.permission.create({ data: { action: 'event:delete' } });

  await prisma.rolePermission.createMany({
    data: [
      { roleId: adminRole.id, permissionId: readPerm.id },
      { roleId: adminRole.id, permissionId: deletePerm.id },
    ],
  });
  await prisma.rolePermission.create({
    data: { roleId: userRole.id, permissionId: readPerm.id },
  });

  const admin = await prisma.user.create({
    data: {
      username: 'admin',
      passwordHash: hashPassword('admin123'),
      displayName: 'Administrator',
      userRoles: { create: { roleId: adminRole.id } },
    },
  });
  const user = await prisma.user.create({
    data: {
      username: 'rares',
      passwordHash: hashPassword('rares123'),
      displayName: 'Rares',
      userRoles: { create: { roleId: userRole.id } },
    },
  });

  return { admin, user, adminRole, userRole, readPerm, deletePerm };
}

describe('authService', () => {
  describe('login', () => {
    it('returns session user for valid admin credentials', async () => {
      await seedRolesAndUsers();
      const result = await authService.login('admin', 'admin123');
      expect(result.username).toBe('admin');
      expect(result.role).toBe('ADMIN');
      expect(result.permissions).toContain('event:delete');
      expect(result.permissions).toContain('event:read');
    });

    it('returns session user for valid normal user credentials', async () => {
      await seedRolesAndUsers();
      const result = await authService.login('rares', 'rares123');
      expect(result.username).toBe('rares');
      expect(result.role).toBe('USER');
      expect(result.permissions).toContain('event:read');
      expect(result.permissions).not.toContain('event:delete');
    });

    it('throws 401 for wrong password', async () => {
      await seedRolesAndUsers();
      await expect(authService.login('admin', 'wrongpassword')).rejects.toMatchObject({
        statusCode: 401,
      });
    });

    it('throws 401 for non-existent user', async () => {
      await seedRolesAndUsers();
      await expect(authService.login('nobody', 'pass')).rejects.toMatchObject({
        statusCode: 401,
      });
    });

    it('throws 400 when username is empty', async () => {
      await expect(authService.login('', 'pass')).rejects.toMatchObject({
        statusCode: 400,
      });
    });
  });

  describe('getUserById', () => {
    it('returns the user when found', async () => {
      const { admin } = await seedRolesAndUsers();
      const result = await authService.getUserById(admin.id);
      expect(result?.username).toBe('admin');
      expect(result?.role).toBe('ADMIN');
    });

    it('returns null for non-existent id', async () => {
      const result = await authService.getUserById(99999);
      expect(result).toBeNull();
    });
  });

  describe('hasPermission', () => {
    it('returns true when user has the permission', async () => {
      await seedRolesAndUsers();
      const user = await authService.login('admin', 'admin123');
      expect(authService.hasPermission(user, 'event:delete')).toBe(true);
    });

    it('returns false when user lacks the permission', async () => {
      await seedRolesAndUsers();
      const user = await authService.login('rares', 'rares123');
      expect(authService.hasPermission(user, 'event:delete')).toBe(false);
    });
  });

  describe('getAllUsers', () => {
    it('returns all users with roles', async () => {
      await seedRolesAndUsers();
      const users = await authService.getAllUsers();
      expect(users).toHaveLength(2);
      const admin = users.find((u) => u.username === 'admin');
      expect(admin?.role).toBe('ADMIN');
    });
  });
});
