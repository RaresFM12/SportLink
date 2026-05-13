import { PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';

const prisma = new PrismaClient();

// Simple SHA-256 hash — matches what authService uses.
// No bcrypt to keep deps minimal; real auth (tokens, bcrypt) is Assignment 4.
function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

async function main() {
  console.log('Seeding database...');

  // ── Clean in dependency order ──────────────────────────────────────────────
  await prisma.comment.deleteMany();
  await prisma.participant.deleteMany();
  await prisma.event.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.user.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.role.deleteMany();

  // ── Permissions ───────────────────────────────────────────────────────────
  const permissions = await Promise.all([
    prisma.permission.create({ data: { action: 'event:read' } }),
    prisma.permission.create({ data: { action: 'event:create' } }),
    prisma.permission.create({ data: { action: 'event:update' } }),
    prisma.permission.create({ data: { action: 'event:delete' } }),
    prisma.permission.create({ data: { action: 'event:join' } }),
    prisma.permission.create({ data: { action: 'event:leave' } }),
    prisma.permission.create({ data: { action: 'comment:create' } }),
    prisma.permission.create({ data: { action: 'comment:update' } }),
    prisma.permission.create({ data: { action: 'comment:delete' } }),
    prisma.permission.create({ data: { action: 'generator:start' } }),
    prisma.permission.create({ data: { action: 'generator:stop' } }),
    prisma.permission.create({ data: { action: 'user:manage' } }),
    prisma.permission.create({ data: { action: 'statistics:read' } }),
    prisma.permission.create({ data: { action: 'chat:read' } }),
    prisma.permission.create({ data: { action: 'chat:write' } }),
  ]);

  const permMap = Object.fromEntries(permissions.map((p) => [p.action, p]));

  // ── Roles ─────────────────────────────────────────────────────────────────
  const adminRole = await prisma.role.create({
    data: { name: 'ADMIN', description: 'Full access to all resources' },
  });

  const userRole = await prisma.role.create({
    data: { name: 'USER', description: 'Standard user access' },
  });

  // ADMIN gets every permission
  await prisma.rolePermission.createMany({
    data: permissions.map((p) => ({ roleId: adminRole.id, permissionId: p.id })),
  });

  // USER gets read + join/leave + comment + chat (no delete events, no generator, no user:manage)
  const userPermissions = [
    'event:read', 'event:create', 'event:join', 'event:leave',
    'comment:create', 'comment:update', 'comment:delete',
    'statistics:read', 'chat:read', 'chat:write',
  ];
  await prisma.rolePermission.createMany({
    data: userPermissions.map((action) => ({
      roleId: userRole.id,
      permissionId: permMap[action].id,
    })),
  });

  // ── Users ─────────────────────────────────────────────────────────────────
  const admin = await prisma.user.create({
    data: {
      username: 'admin',
      passwordHash: hashPassword('admin123'),
      displayName: 'Administrator',
      userRoles: { create: { roleId: adminRole.id } },
    },
  });

  const rares = await prisma.user.create({
    data: {
      username: 'rares',
      passwordHash: hashPassword('rares123'),
      displayName: 'Rares',
      userRoles: { create: { roleId: userRole.id } },
    },
  });

  const alex = await prisma.user.create({
    data: {
      username: 'alex',
      passwordHash: hashPassword('alex123'),
      displayName: 'Alex',
      userRoles: { create: { roleId: userRole.id } },
    },
  });

  // ── Events ────────────────────────────────────────────────────────────────
  const football = await prisma.event.create({
    data: {
      createdByUserId: rares.id,
      title: 'Football Meetup',
      sport: 'Football',
      city: 'Bucharest',
      date: '2026-05-10',
      startTime: '10:00',
      duration: '2 hours',
      location: 'National Arena',
      maxParticipants: 22,
      description: 'A casual football meetup for all skill levels.',
      participants: {
        create: [{ userName: 'Rares' }, { userName: 'Alex' }, { userName: 'Maria' }],
      },
    },
  });

  const basketball = await prisma.event.create({
    data: {
      createdByUserId: alex.id,
      title: 'Basketball Session',
      sport: 'Basketball',
      city: 'Cluj-Napoca',
      date: '2026-05-12',
      startTime: '14:00',
      duration: '1.5 hours',
      location: 'Sports Hall Cluj',
      maxParticipants: 10,
      description: 'Pick-up basketball game. Bring your own water.',
      participants: { create: [{ userName: 'Dan' }, { userName: 'Ioana' }] },
    },
  });

  // ── Comments ──────────────────────────────────────────────────────────────
  await prisma.comment.createMany({
    data: [
      { eventId: football.id, author: 'Rares', content: 'Looking forward to this!' },
      { eventId: football.id, author: 'Alex', content: 'Should we bring extra balls?' },
      { eventId: basketball.id, author: 'Dan', content: 'I will be there at 13:45.' },
    ],
  });

  console.log('Seeded:');
  console.log(`  Users: admin (admin123), rares (rares123), alex (alex123)`);
  console.log(`  Roles: ADMIN, USER`);
  console.log(`  Permissions: ${permissions.length} permissions`);
  console.log(`  Events: ${football.id}, ${basketball.id}`);
  console.log('Seeding complete.');
}

main()
  .catch((err) => { console.error('Seed failed:', err); process.exit(1); })
  .finally(() => prisma.$disconnect());
