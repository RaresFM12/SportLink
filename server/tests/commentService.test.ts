import { describe, it, expect } from 'vitest';
import { eventService } from '../src/services/eventService.js';
import { commentService } from '../src/services/commentService.js';

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

describe('commentService', () => {
  // ── CREATE ────────────────────────────────────────────────────────────────
  describe('create', () => {
    it('creates a comment on an existing event', async () => {
      const event = await eventService.create(BASE_EVENT);
      const comment = await commentService.create({
        eventId: event.id,
        author: 'Rares',
        content: 'Great event!',
      });
      expect(comment.id).toBeGreaterThan(0);
      expect(comment.eventId).toBe(event.id);
      expect(comment.author).toBe('Rares');
      expect(comment.content).toBe('Great event!');
      expect(comment.createdAt).toBeTruthy();
    });

    it('throws 404 when event does not exist', async () => {
      await expect(
        commentService.create({ eventId: 99999, author: 'A', content: 'B' })
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('throws 400 when author is empty', async () => {
      const event = await eventService.create(BASE_EVENT);
      await expect(
        commentService.create({ eventId: event.id, author: '  ', content: 'Hello' })
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('throws 400 when content is empty', async () => {
      const event = await eventService.create(BASE_EVENT);
      await expect(
        commentService.create({ eventId: event.id, author: 'Rares', content: '' })
      ).rejects.toMatchObject({ statusCode: 400 });
    });
  });

  // ── READ ──────────────────────────────────────────────────────────────────
  describe('getByEventId', () => {
    it('returns all comments for an event in creation order', async () => {
      const event = await eventService.create(BASE_EVENT);
      await commentService.create({ eventId: event.id, author: 'A', content: 'First' });
      await commentService.create({ eventId: event.id, author: 'B', content: 'Second' });
      const comments = await commentService.getByEventId(event.id);
      expect(comments).toHaveLength(2);
      expect(comments[0].content).toBe('First');
      expect(comments[1].content).toBe('Second');
    });

    it('returns empty array when event has no comments', async () => {
      const event = await eventService.create(BASE_EVENT);
      const comments = await commentService.getByEventId(event.id);
      expect(comments).toHaveLength(0);
    });

    it('throws 404 for non-existent event', async () => {
      await expect(commentService.getByEventId(99999)).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  // ── UPDATE ────────────────────────────────────────────────────────────────
  describe('update', () => {
    it('updates comment content', async () => {
      const event = await eventService.create(BASE_EVENT);
      const comment = await commentService.create({
        eventId: event.id,
        author: 'Rares',
        content: 'Original',
      });
      const updated = await commentService.update(comment.id, { content: 'Updated' });
      expect(updated.content).toBe('Updated');
      expect(updated.author).toBe('Rares'); // unchanged
    });

    it('throws 404 for non-existent comment', async () => {
      await expect(
        commentService.update(99999, { content: 'X' })
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('throws 400 when new content is empty', async () => {
      const event = await eventService.create(BASE_EVENT);
      const comment = await commentService.create({
        eventId: event.id,
        author: 'Rares',
        content: 'Original',
      });
      await expect(
        commentService.update(comment.id, { content: '   ' })
      ).rejects.toMatchObject({ statusCode: 400 });
    });
  });

  // ── DELETE ────────────────────────────────────────────────────────────────
  describe('remove', () => {
    it('deletes a comment', async () => {
      const event = await eventService.create(BASE_EVENT);
      const comment = await commentService.create({
        eventId: event.id,
        author: 'Rares',
        content: 'To delete',
      });
      await commentService.remove(comment.id);
      const comments = await commentService.getByEventId(event.id);
      expect(comments).toHaveLength(0);
    });

    it('throws 404 for non-existent comment', async () => {
      await expect(commentService.remove(99999)).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  // ── CASCADE ───────────────────────────────────────────────────────────────
  describe('cascade delete', () => {
    it('deletes comments when parent event is deleted', async () => {
      const event = await eventService.create(BASE_EVENT);
      await commentService.create({ eventId: event.id, author: 'A', content: 'Test' });
      await eventService.remove(event.id);
      // Event is gone — getByEventId should throw 404
      await expect(commentService.getByEventId(event.id)).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });
});
