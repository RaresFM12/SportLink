import { faker } from '@faker-js/faker';
import { prisma } from '../lib/prisma.js';
import { eventService } from './eventService.js';
import { broadcastWebSocketMessage } from '../websocket/wsServer.js';

type GeneratorStatus = {
  running: boolean;
  batchSize: number;
  intervalMs: number;
};

const SPORTS = ['Football', 'Basketball', 'Tennis', 'Volleyball', 'Baseball', 'Other'] as const;
const START_HOURS = ['08:00', '09:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'] as const;
const DURATIONS = ['1 hour', '1.5 hours', '2 hours', '2.5 hours', '3 hours'] as const;

let generatorInterval: NodeJS.Timeout | null = null;
let currentBatchSize = 3;
let currentIntervalMs = 4000;

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function buildParticipants(maxParticipants: number): string[] {
  const count = faker.number.int({ min: 0, max: Math.min(4, maxParticipants) });
  return Array.from({ length: count }, () => faker.person.firstName());
}

function buildValidFakeEventInput() {
  const sport = faker.helpers.arrayElement(SPORTS);
  const city = faker.location.city();
  const maxParticipants = faker.number.int({ min: 2, max: 20 });

  return {
    title: `${sport} ${faker.helpers.arrayElement(['Match', 'Meetup', 'Training', 'Session'])}`,
    sport,
    city,
    location: `${faker.company.name()} Arena`,
    date: formatDate(faker.date.soon({ days: 20 })),
    startTime: faker.helpers.arrayElement(START_HOURS),
    duration: faker.helpers.arrayElement(DURATIONS),
    maxParticipants,
    description: faker.lorem.sentence(),
    participants: buildParticipants(maxParticipants),
  };
}

async function createBatch(batchSize: number): Promise<void> {
  const creates = Array.from({ length: batchSize }, () =>
    eventService.create(buildValidFakeEventInput())
  );
  await Promise.all(creates);

  // Count directly from DB — accurate, no in-memory drift
  const totalEvents = await prisma.event.count();

  broadcastWebSocketMessage({
    type: 'generator-batch-created',
    payload: { batchSize, totalEvents },
  });
}

export const generatorService = {
  start(batchSize = 3, intervalMs = 4000): GeneratorStatus {
    if (generatorInterval) {
      return { running: true, batchSize: currentBatchSize, intervalMs: currentIntervalMs };
    }

    currentBatchSize = batchSize;
    currentIntervalMs = intervalMs;

    generatorInterval = setInterval(() => {
      void createBatch(currentBatchSize);
    }, currentIntervalMs);

    broadcastWebSocketMessage({ type: 'generator-status', payload: { running: true } });

    return { running: true, batchSize: currentBatchSize, intervalMs: currentIntervalMs };
  },

  stop(): GeneratorStatus {
    if (generatorInterval) {
      clearInterval(generatorInterval);
      generatorInterval = null;
    }
    broadcastWebSocketMessage({ type: 'generator-status', payload: { running: false } });
    return { running: false, batchSize: currentBatchSize, intervalMs: currentIntervalMs };
  },

  getStatus(): GeneratorStatus {
    return {
      running: generatorInterval !== null,
      batchSize: currentBatchSize,
      intervalMs: currentIntervalMs,
    };
  },
};
