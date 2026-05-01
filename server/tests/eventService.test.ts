import { describe, it, expect } from 'vitest';
import { eventService } from '../src/services/eventService.js';
import { HttpError } from '../src/utils/httpErrors.js';

const BASE_EVENT = {
  title: 'Football Meetup',
  sport: 'Football',
  city: 'Bucharest',
  date: '2026-06-01',
  startTime: '10:00',
  duration: '2 hours',
  location: 'National Arena',
  maxParticipants: 10,
  description: 'Test event',
  participants: [] as string[],
};

describe('eventService', () => {
  // ── CREATE ────────────────────────────────────────────────────────────────
  describe('create', () => {
    it('creates an event and returns it with a positive id', async () => {
      const event = await eventService.create(BASE_EVENT);
      expect(event.id).toBeGreaterThan(0);
      expect(event.title).toBe('Football Meetup');
      expect(event.currentParticipants).toBe(0);
    });

    it('stores participants and reflects them in currentParticipants', async () => {
      const event = await eventService.create({
        ...BASE_EVENT,
        participants: ['Alice', 'Bob'],
      });
      expect(event.participants).toEqual(expect.arrayContaining(['Alice', 'Bob']));
      expect(event.currentParticipants).toBe(2);
    });
  });

  // ── READ ──────────────────────────────────────────────────────────────────
  describe('getById', () => {
    it('returns the event when it exists', async () => {
      const created = await eventService.create(BASE_EVENT);
      const found = await eventService.getById(created.id);
      expect(found.id).toBe(created.id);
      expect(found.title).toBe(created.title);
    });

    it('throws 404 when event does not exist', async () => {
      await expect(eventService.getById(99999)).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  // ── GET ALL + FILTERS ─────────────────────────────────────────────────────
  describe('getAll', () => {
    it('returns all events when no filters applied', async () => {
      await eventService.create(BASE_EVENT);
      await eventService.create({ ...BASE_EVENT, title: 'Tennis Match', sport: 'Tennis' });
      const result = await eventService.getAll({}, { page: 1, limit: 10 });
      expect(result.totalItems).toBe(2);
    });

    it('filters by sport (case-insensitive)', async () => {
      await eventService.create(BASE_EVENT);
      await eventService.create({ ...BASE_EVENT, title: 'Tennis Match', sport: 'Tennis' });
      const result = await eventService.getAll({ sport: 'football' }, { page: 1, limit: 10 });
      expect(result.totalItems).toBe(1);
      expect(result.items[0].sport).toBe('Football');
    });

    it('filters by date', async () => {
      await eventService.create(BASE_EVENT);
      await eventService.create({ ...BASE_EVENT, date: '2026-07-01' });
      const result = await eventService.getAll({ date: '2026-06-01' }, { page: 1, limit: 10 });
      expect(result.totalItems).toBe(1);
    });

    it('filters by location (partial match on location and city)', async () => {
      await eventService.create(BASE_EVENT); // location: National Arena, city: Bucharest
      await eventService.create({ ...BASE_EVENT, location: 'City Park', city: 'Cluj' });
      const byLocation = await eventService.getAll({ location: 'arena' }, { page: 1, limit: 10 });
      expect(byLocation.totalItems).toBe(1);
      const byCity = await eventService.getAll({ location: 'cluj' }, { page: 1, limit: 10 });
      expect(byCity.totalItems).toBe(1);
    });

    it('filters joinedOnly for a specific user', async () => {
      const e1 = await eventService.create({ ...BASE_EVENT, participants: ['Rares'] });
      await eventService.create(BASE_EVENT); // no participants
      const result = await eventService.getAll(
        { joinedOnly: true, user: 'Rares' },
        { page: 1, limit: 10 }
      );
      expect(result.totalItems).toBe(1);
      expect(result.items[0].id).toBe(e1.id);
    });

    it('paginates correctly', async () => {
      for (let i = 0; i < 7; i++) {
        await eventService.create({ ...BASE_EVENT, title: `Event ${i}` });
      }
      const page1 = await eventService.getAll({}, { page: 1, limit: 3 });
      expect(page1.items).toHaveLength(3);
      expect(page1.totalItems).toBe(7);
      expect(page1.totalPages).toBe(3);

      const page3 = await eventService.getAll({}, { page: 3, limit: 3 });
      expect(page3.items).toHaveLength(1);
    });
  });

  // ── UPDATE ────────────────────────────────────────────────────────────────
  describe('update', () => {
    it('updates specified fields', async () => {
      const created = await eventService.create(BASE_EVENT);
      const updated = await eventService.update(created.id, { title: 'New Title' });
      expect(updated.title).toBe('New Title');
      expect(updated.sport).toBe('Football'); // unchanged
    });

    it('throws 400 when participants exceed maxParticipants', async () => {
      const created = await eventService.create({ ...BASE_EVENT, maxParticipants: 2 });
      await expect(
        eventService.update(created.id, {
          participants: ['A', 'B', 'C'],
          maxParticipants: 2,
        })
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('throws 404 for non-existent event', async () => {
      await expect(eventService.update(99999, { title: 'X' })).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  // ── DELETE ────────────────────────────────────────────────────────────────
  describe('remove', () => {
    it('deletes the event', async () => {
      const created = await eventService.create(BASE_EVENT);
      await eventService.remove(created.id);
      await expect(eventService.getById(created.id)).rejects.toMatchObject({ statusCode: 404 });
    });

    it('throws 404 for non-existent event', async () => {
      await expect(eventService.remove(99999)).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  // ── JOIN / LEAVE ──────────────────────────────────────────────────────────
  describe('join', () => {
    it('adds a participant', async () => {
      const created = await eventService.create(BASE_EVENT);
      const updated = await eventService.join(created.id, 'Alice');
      expect(updated.participants).toContain('Alice');
      expect(updated.currentParticipants).toBe(1);
    });

    it('throws 409 if user already joined', async () => {
      const created = await eventService.create({ ...BASE_EVENT, participants: ['Alice'] });
      await expect(eventService.join(created.id, 'Alice')).rejects.toMatchObject({
        statusCode: 409,
      });
    });

    it('throws 409 if event is full', async () => {
      const created = await eventService.create({
        ...BASE_EVENT,
        maxParticipants: 2,
        participants: ['Alice', 'Bob'],
      });
      await expect(eventService.join(created.id, 'Charlie')).rejects.toMatchObject({
        statusCode: 409,
      });
    });
  });

  describe('leave', () => {
    it('removes a participant', async () => {
      const created = await eventService.create({ ...BASE_EVENT, participants: ['Alice'] });
      const updated = await eventService.leave(created.id, 'Alice');
      expect(updated.participants).not.toContain('Alice');
      expect(updated.currentParticipants).toBe(0);
    });

    it('throws 409 if user is not a participant', async () => {
      const created = await eventService.create(BASE_EVENT);
      await expect(eventService.leave(created.id, 'Nobody')).rejects.toMatchObject({
        statusCode: 409,
      });
    });
  });
});
