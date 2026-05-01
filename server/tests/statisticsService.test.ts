import { describe, it, expect } from 'vitest';
import { eventService } from '../src/services/eventService.js';
import { commentService } from '../src/services/commentService.js';
import { statisticsService } from '../src/services/statisticsService.js';

const BASE_EVENT = {
  title: 'Test Event',
  sport: 'Football',
  city: 'Bucharest',
  date: '2026-06-01',
  startTime: '10:00',
  duration: '2 hours',
  location: 'National Arena',
  maxParticipants: 10,
  description: 'Test',
  participants: [] as string[],
};

describe('statisticsService', () => {
  describe('getStatistics', () => {
    it('returns empty arrays when no events exist', async () => {
      const stats = await statisticsService.getStatistics();
      expect(stats.sports).toHaveLength(0);
      expect(stats.locations).toHaveLength(0);
      expect(stats.dates).toHaveLength(0);
      expect(stats.comments.totalComments).toBe(0);
    });

    it('counts events by sport correctly', async () => {
      await eventService.create({ ...BASE_EVENT, sport: 'Football' });
      await eventService.create({ ...BASE_EVENT, sport: 'Football' });
      await eventService.create({ ...BASE_EVENT, sport: 'Tennis' });

      const stats = await statisticsService.getStatistics();
      const football = stats.sports.find((s) => s.sport === 'Football');
      const tennis = stats.sports.find((s) => s.sport === 'Tennis');

      expect(football?.count).toBe(2);
      expect(tennis?.count).toBe(1);
    });

    it('counts events by location correctly', async () => {
      await eventService.create({ ...BASE_EVENT, location: 'Arena A' });
      await eventService.create({ ...BASE_EVENT, location: 'Arena A' });
      await eventService.create({ ...BASE_EVENT, location: 'Park B' });

      const stats = await statisticsService.getStatistics();
      const arenaA = stats.locations.find((l) => l.location === 'Arena A');
      expect(arenaA?.count).toBe(2);
    });

    it('counts events by date correctly', async () => {
      await eventService.create({ ...BASE_EVENT, date: '2026-06-01' });
      await eventService.create({ ...BASE_EVENT, date: '2026-06-01' });
      await eventService.create({ ...BASE_EVENT, date: '2026-07-01' });

      const stats = await statisticsService.getStatistics();
      const june = stats.dates.find((d) => d.date === '2026-06-01');
      expect(june?.count).toBe(2);
    });

    it('includes comment statistics', async () => {
      const e1 = await eventService.create(BASE_EVENT);
      const e2 = await eventService.create({ ...BASE_EVENT, title: 'Event 2' });

      await commentService.create({ eventId: e1.id, author: 'A', content: 'C1' });
      await commentService.create({ eventId: e1.id, author: 'B', content: 'C2' });
      await commentService.create({ eventId: e2.id, author: 'C', content: 'C3' });

      const stats = await statisticsService.getStatistics();

      expect(stats.comments.totalComments).toBe(3);
      expect(stats.comments.commentsPerEvent).toHaveLength(2);

      // mostCommentedEvents should put e1 first (2 comments)
      expect(stats.comments.mostCommentedEvents[0].eventId).toBe(e1.id);
      expect(stats.comments.mostCommentedEvents[0].count).toBe(2);
    });
  });
});
