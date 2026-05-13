/// <reference types="vitest/globals" />
import request from 'supertest';
import { createHash } from 'crypto';
import { describe, expect, it } from 'vitest';
import { app, sessionStore } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

async function seedAuthData() {
  const adminRole = await prisma.role.create({
    data: { name: 'ADMIN', description: 'Full access' },
  });
  const userRole = await prisma.role.create({
    data: { name: 'USER', description: 'Standard access' },
  });

  const permissions = await Promise.all([
    prisma.permission.create({ data: { action: 'event:read' } }),
    prisma.permission.create({ data: { action: 'event:create' } }),
    prisma.permission.create({ data: { action: 'user:manage' } }),
  ]);

  await prisma.rolePermission.createMany({
    data: [
      ...permissions.map((permission) => ({ roleId: adminRole.id, permissionId: permission.id })),
      { roleId: userRole.id, permissionId: permissions[0].id },
      { roleId: userRole.id, permissionId: permissions[1].id },
    ],
  });

  await prisma.user.create({
    data: {
      username: 'admin',
      displayName: 'Admin',
      passwordHash: hashPassword('admin123'),
      userRoles: { create: { roleId: adminRole.id } },
    },
  });

  await prisma.user.create({
    data: {
      username: 'rares',
      displayName: 'Rares',
      passwordHash: hashPassword('rares123'),
      userRoles: { create: { roleId: userRole.id } },
    },
  });
}

describe('auth routes', () => {
  it('registers a USER, creates a session, and returns a signed token', async () => {
    await seedAuthData();

    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'newuser', displayName: 'New User', password: 'secret123' })
      .expect(201);

    expect(res.body).toMatchObject({
      username: 'newuser',
      displayName: 'New User',
      role: 'USER',
    });
    expect(res.body.permissions).toContain('event:read');
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.sid).toEqual(expect.any(String));
    expect(res.headers['set-cookie']?.[0]).toContain('HttpOnly');
  });

  it('logs in over the API and lets the token-backed session read /me', async () => {
    await seedAuthData();

    const login = await request(app)
      .post('/api/auth/login')
      .send({ username: 'rares', password: 'rares123' })
      .expect(200);

    await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${login.body.token}`)
      .set('X-Session-Id', login.body.sid)
      .expect(200)
      .expect((res) => {
        expect(res.body.username).toBe('rares');
        expect(res.body.role).toBe('USER');
        expect(res.body.permissions).not.toContain('user:manage');
      });
  });

  it('rejects invalid login credentials', async () => {
    await seedAuthData();

    await request(app)
      .post('/api/auth/login')
      .send({ username: 'rares', password: 'wrong' })
      .expect(401);
  });

  it('blocks USER accounts from admin-only user management', async () => {
    await seedAuthData();

    const login = await request(app)
      .post('/api/auth/login')
      .send({ username: 'rares', password: 'rares123' })
      .expect(200);

    await request(app)
      .get('/api/auth/users')
      .set('Authorization', `Bearer ${login.body.token}`)
      .set('X-Session-Id', login.body.sid)
      .expect(403);
  });

  it('creates scoped permission tokens that cannot exceed their scheme', async () => {
    await seedAuthData();

    const login = await request(app)
      .post('/api/auth/login')
      .send({ username: 'rares', password: 'rares123' })
      .expect(200);

    const scoped = await request(app)
      .post('/api/auth/tokens')
      .set('Authorization', `Bearer ${login.body.token}`)
      .set('X-Session-Id', login.body.sid)
      .send({ scheme: 'read-only' })
      .expect(201);

    expect(scoped.body.permissions).toContain('event:read');
    expect(scoped.body.permissions).not.toContain('event:create');

    await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${scoped.body.token}`)
      .set('X-Session-Id', scoped.body.sid)
      .send({
        title: 'Scoped token event',
        sport: 'Football',
        city: 'Bucharest',
        date: '2026-05-20',
        startTime: '10:00',
        duration: '1 hour',
        location: 'Park',
        maxParticipants: 8,
        description: 'Should be rejected by read-only scope.',
      })
      .expect(403);
  });

  it('generates a password reset token and accepts the new password', async () => {
    await seedAuthData();

    const reset = await request(app)
      .post('/api/auth/password/forgot')
      .send({ username: 'rares' })
      .expect(200);

    expect(reset.body.resetToken).toEqual(expect.any(String));

    await request(app)
      .post('/api/auth/password/reset')
      .send({ token: reset.body.resetToken, password: 'newpass123' })
      .expect(200);

    await request(app)
      .post('/api/auth/login')
      .send({ username: 'rares', password: 'newpass123' })
      .expect(200);
  });

  it('expires an authenticated session after inactivity', async () => {
    await seedAuthData();

    const login = await request(app)
      .post('/api/auth/login')
      .send({ username: 'rares', password: 'rares123' })
      .expect(200);

    const staleTime = Date.now() - 1000 * 60 * 60;
    await new Promise<void>((resolve, reject) => {
      sessionStore.get(login.body.sid, (getErr, sessionData) => {
        if (getErr || !sessionData) {
          reject(getErr ?? new Error('Session was not stored.'));
          return;
        }
        sessionData.lastActivityAt = staleTime;
        sessionStore.set(login.body.sid, sessionData, (setErr) => {
          if (setErr) reject(setErr);
          else resolve();
        });
      });
    });

    await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${login.body.token}`)
      .set('X-Session-Id', login.body.sid)
      .expect(401);
  });
});
