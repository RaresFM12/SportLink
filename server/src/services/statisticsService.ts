import { prisma } from '../lib/prisma.js';
import { commentService } from './commentService.js';
import type { StatisticsResponse } from '../types/event.js';

export type CoParticipationMode = 'naive' | 'optimized';

export type CoParticipationRow = {
  userA: string;
  userB: string;
  sharedEvents: number;
};

export type CoParticipationStats = {
  mode: CoParticipationMode;
  cached: boolean;
  generatedAt: string;
  durationMs: number;
  rows: CoParticipationRow[];
};

const CO_PARTICIPATION_CACHE_TTL_MS = Number(process.env.CO_PARTICIPATION_CACHE_TTL_MS ?? 30_000);
let coParticipationCache: { expiresAt: number; rows: CoParticipationRow[]; generatedAt: string } | null = null;

export const statisticsService = {
  async getStatistics(): Promise<StatisticsResponse> {
    // All three GROUP BY queries run in parallel
    const [sportRows, locationRows, dateRows, comments] = await Promise.all([
      prisma.event.groupBy({
        by: ['sport'],
        _count: { id: true },
        orderBy: { sport: 'asc' },
      }),
      prisma.event.groupBy({
        by: ['location'],
        _count: { id: true },
        orderBy: { location: 'asc' },
      }),
      prisma.event.groupBy({
        by: ['date'],
        _count: { id: true },
        orderBy: { date: 'asc' },
      }),
      commentService.getStats(),
    ]);

    return {
      sports: sportRows.map((r) => ({ sport: r.sport, count: r._count.id })),
      locations: locationRows.map((r) => ({ location: r.location, count: r._count.id })),
      dates: dateRows.map((r) => ({ date: r.date, count: r._count.id })),
      comments,
    };
  },

  async getCoParticipationStats(
    mode: CoParticipationMode = 'optimized',
    limit = 25
  ): Promise<CoParticipationStats> {
    const safeLimit = Math.max(1, Math.min(limit, 100));
    const startedAt = performance.now();

    if (mode === 'optimized' && coParticipationCache && coParticipationCache.expiresAt > Date.now()) {
      return {
        mode,
        cached: true,
        generatedAt: coParticipationCache.generatedAt,
        durationMs: Number((performance.now() - startedAt).toFixed(2)),
        rows: coParticipationCache.rows.slice(0, safeLimit),
      };
    }

    const rows = mode === 'naive'
      ? await getCoParticipationNaive(safeLimit)
      : await getCoParticipationOptimized(safeLimit);

    const generatedAt = new Date().toISOString();
    if (mode === 'optimized') {
      coParticipationCache = {
        rows,
        generatedAt,
        expiresAt: Date.now() + CO_PARTICIPATION_CACHE_TTL_MS,
      };
    }

    return {
      mode,
      cached: false,
      generatedAt,
      durationMs: Number((performance.now() - startedAt).toFixed(2)),
      rows,
    };
  },
};

async function getCoParticipationNaive(limit: number): Promise<CoParticipationRow[]> {
  const events = await prisma.event.findMany({
    select: {
      participants: { select: { userName: true } },
    },
  });

  const counts = new Map<string, CoParticipationRow>();
  for (const event of events) {
    const names = [...new Set(event.participants.map((p) => p.userName))].sort();
    for (let i = 0; i < names.length; i += 1) {
      for (let j = i + 1; j < names.length; j += 1) {
        const userA = names[i];
        const userB = names[j];
        const key = `${userA}\u0000${userB}`;
        const existing = counts.get(key);
        if (existing) existing.sharedEvents += 1;
        else counts.set(key, { userA, userB, sharedEvents: 1 });
      }
    }
  }

  return [...counts.values()]
    .sort((a, b) => b.sharedEvents - a.sharedEvents || a.userA.localeCompare(b.userA))
    .slice(0, limit);
}

async function getCoParticipationOptimized(limit: number): Promise<CoParticipationRow[]> {
  const rows = await prisma.$queryRaw<CoParticipationRow[]>`
    SELECT
      p1."userName" AS "userA",
      p2."userName" AS "userB",
      COUNT(*)::int AS "sharedEvents"
    FROM "Participant" p1
    INNER JOIN "Participant" p2
      ON p1."eventId" = p2."eventId"
      AND p1."userName" < p2."userName"
    GROUP BY p1."userName", p2."userName"
    ORDER BY "sharedEvents" DESC, p1."userName" ASC
    LIMIT ${limit}
  `;
  return rows;
}
