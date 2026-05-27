import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';
import { createHash } from 'crypto';

const prisma = new PrismaClient();

const USER_COUNT = Number(process.env.GOLD_USER_COUNT ?? 120);
const EVENT_COUNT = Number(process.env.GOLD_EVENT_COUNT ?? 100);
const COMMENTS_PER_EVENT = Number(process.env.GOLD_COMMENTS_PER_EVENT ?? 3);
const PARTICIPANTS_PER_EVENT_MIN = Number(process.env.GOLD_PARTICIPANTS_PER_EVENT_MIN ?? 8);
const PARTICIPANTS_PER_EVENT_MAX = Number(process.env.GOLD_PARTICIPANTS_PER_EVENT_MAX ?? 24);

const SPORTS = ['Football', 'Basketball', 'Tennis', 'Volleyball', 'Baseball', 'Running', 'Cycling'];
const START_HOURS = ['08:00', '09:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'];
const DURATIONS = ['1 hour', '1.5 hours', '2 hours', '2.5 hours', '3 hours'];
const LOCATIONS = [
  { city: 'Bucharest', location: 'National Arena' },
  { city: 'Cluj-Napoca', location: 'Sports Hall Cluj' },
  { city: 'Iasi', location: 'Copou Sports Park' },
  { city: 'Timisoara', location: 'Bega Fitness Center' },
  { city: 'Brasov', location: 'Tampa Outdoor Courts' },
  { city: 'Constanta', location: 'Tomis Beach Courts' },
  { city: 'Oradea', location: 'Crisul Arena' },
];
const PERMISSIONS = [
  'event:read',
  'event:create',
  'event:update',
  'event:delete',
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
];
const USER_PERMISSIONS = [
  'event:read',
  'event:create',
  'event:join',
  'event:leave',
  'comment:create',
  'comment:update',
  'comment:delete',
  'statistics:read',
  'chat:read',
  'chat:write',
];

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

async function main() {
  console.log('Gold seed started...');
  console.log(`Users=${USER_COUNT}, Events=${EVENT_COUNT}`);

  await prisma.comment.deleteMany();
  await prisma.participant.deleteMany();
  await prisma.event.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.actionLog.deleteMany();
  await prisma.observationUser.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.user.deleteMany();

  const userRole = await prisma.role.upsert({
    where: { name: 'USER' },
    update: {},
    create: { name: 'USER', description: 'Standard user access' },
  });
  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: { name: 'ADMIN', description: 'Full access to all resources' },
  });

  const permissions = await Promise.all(
    PERMISSIONS.map((action) =>
      prisma.permission.upsert({
        where: { action },
        update: {},
        create: { action },
      })
    )
  );
  const permissionByAction = Object.fromEntries(permissions.map((p) => [p.action, p]));

  await prisma.rolePermission.createMany({
    data: permissions.map((permission) => ({ roleId: adminRole.id, permissionId: permission.id })),
    skipDuplicates: true,
  });
  await prisma.rolePermission.createMany({
    data: USER_PERMISSIONS.map((action) => ({
      roleId: userRole.id,
      permissionId: permissionByAction[action].id,
    })),
    skipDuplicates: true,
  });

  const demoUsers = [
    { username: 'admin', displayName: 'Administrator', passwordHash: hashPassword('admin123'), roleId: adminRole.id },
    { username: 'rares', displayName: 'Rares', passwordHash: hashPassword('rares123'), roleId: userRole.id },
    { username: 'alex', displayName: 'Alex', passwordHash: hashPassword('alex123'), roleId: userRole.id },
  ];

  for (const user of demoUsers) {
    await prisma.user.create({
      data: {
        username: user.username,
        displayName: user.displayName,
        passwordHash: user.passwordHash,
        userRoles: { create: { roleId: user.roleId } },
      },
    });
  }

  const users = Array.from({ length: USER_COUNT }, (_, index) => ({
    username: `gold_user_${index}`,
    displayName: faker.person.fullName(),
    passwordHash: hashPassword('password123'),
  }));

  for (let i = 0; i < users.length; i += 100) {
    await prisma.user.createMany({ data: users.slice(i, i + 100), skipDuplicates: true });
    console.log(`Created users ${Math.min(i + 100, users.length)}/${users.length}`);
  }

  const createdUsers = await prisma.user.findMany({
    where: { username: { startsWith: 'gold_user_' } },
    select: { id: true, displayName: true },
  });

  for (let i = 0; i < createdUsers.length; i += 1000) {
    await prisma.userRole.createMany({
      data: createdUsers.slice(i, i + 1000).map((user) => ({ userId: user.id, roleId: userRole.id })),
      skipDuplicates: true,
    });
  }

  for (let i = 0; i < EVENT_COUNT; i += 1) {
    const maxParticipants = faker.number.int({ min: PARTICIPANTS_PER_EVENT_MAX, max: PARTICIPANTS_PER_EVENT_MAX + 12 });
    const participantCount = faker.number.int({
      min: PARTICIPANTS_PER_EVENT_MIN,
      max: Math.min(PARTICIPANTS_PER_EVENT_MAX, maxParticipants),
    });
    const participants = faker.helpers.arrayElements(createdUsers, participantCount);
    const creator = faker.helpers.arrayElement(createdUsers);
    const sport = faker.helpers.arrayElement(SPORTS);
    const venue = LOCATIONS[i % LOCATIONS.length];

    const event = await prisma.event.create({
      data: {
        createdByUserId: creator.id,
        title: `${sport} ${faker.helpers.arrayElement(['Match', 'Meetup', 'Training', 'Session'])}`,
        sport,
        city: venue.city,
        date: formatDate(faker.date.soon({ days: 90 })),
        startTime: faker.helpers.arrayElement(START_HOURS),
        duration: faker.helpers.arrayElement(DURATIONS),
        location: venue.location,
        maxParticipants,
        description: faker.lorem.sentence(),
        participants: {
          create: participants.map((user) => ({ userName: user.displayName })),
        },
      },
      select: { id: true },
    });

    await prisma.comment.createMany({
      data: Array.from({ length: COMMENTS_PER_EVENT }, () => {
        const author = faker.helpers.arrayElement(participants);
        return {
          eventId: event.id,
          author: author.displayName,
          content: faker.lorem.sentence(),
        };
      }),
    });

    if ((i + 1) % 100 === 0) console.log(`Created events ${i + 1}/${EVENT_COUNT}`);
  }

  console.log('Gold seed complete.');
}

main()
  .catch((err) => {
    console.error('Gold seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
