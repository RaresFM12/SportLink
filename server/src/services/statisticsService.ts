import { prisma } from '../lib/prisma.js';
import { commentService } from './commentService.js';
import type { StatisticsResponse } from '../types/event.js';

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
};
