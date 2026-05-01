import { prismaCommentStore } from '../data/prismaCommentStore.js';
import { prismaEventStore } from '../data/prismaEventStore.js';
import { HttpError } from '../utils/httpErrors.js';
import type { Comment, CommentStats, CreateCommentInput, UpdateCommentInput } from '../types/comment.js';

export const commentService = {
  async getByEventId(eventId: number): Promise<Comment[]> {
    const event = await prismaEventStore.getById(eventId);
    if (!event) throw new HttpError(404, 'Event not found.');
    return prismaCommentStore.getByEventId(eventId);
  },

  async getById(id: number): Promise<Comment> {
    const comment = await prismaCommentStore.getById(id);
    if (!comment) throw new HttpError(404, 'Comment not found.');
    return comment;
  },

  async create(input: CreateCommentInput): Promise<Comment> {
    const event = await prismaEventStore.getById(input.eventId);
    if (!event) throw new HttpError(404, 'Event not found.');

    if (!input.author || input.author.trim().length === 0) {
      throw new HttpError(400, 'Author is required.');
    }
    if (!input.content || input.content.trim().length === 0) {
      throw new HttpError(400, 'Content is required.');
    }

    return prismaCommentStore.add({
      eventId: input.eventId,
      author: input.author.trim(),
      content: input.content.trim(),
    });
  },

  async update(id: number, input: UpdateCommentInput): Promise<Comment> {
    const existing = await prismaCommentStore.getById(id);
    if (!existing) throw new HttpError(404, 'Comment not found.');

    if (!input.content || input.content.trim().length === 0) {
      throw new HttpError(400, 'Content is required.');
    }

    const updated = await prismaCommentStore.update(id, input.content.trim());
    if (!updated) throw new HttpError(404, 'Comment not found.');
    return updated;
  },

  async remove(id: number): Promise<void> {
    const existing = await prismaCommentStore.getById(id);
    if (!existing) throw new HttpError(404, 'Comment not found.');
    await prismaCommentStore.remove(id);
  },

  async getStats(): Promise<CommentStats> {
    // Uses SQL GROUP BY via prisma.comment.groupBy — efficient single query
    const [countPerEvent, totalComments] = await Promise.all([
      prismaCommentStore.countPerEvent(),
      prismaCommentStore.totalCount(),
    ]);

    // Fetch event titles for the events that have comments
    const eventIds = countPerEvent.map((r) => r.eventId);
    const events = await Promise.all(eventIds.map((id) => prismaEventStore.getById(id)));

    const titleMap = new Map<number, string>();
    for (const event of events) {
      if (event) titleMap.set(event.id, event.title);
    }

    const commentsPerEvent = countPerEvent.map((r) => ({
      eventId: r.eventId,
      eventTitle: titleMap.get(r.eventId) ?? `Event ${r.eventId}`,
      count: r.count,
    }));

    const mostCommentedEvents = [...commentsPerEvent]
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return { totalComments, commentsPerEvent, mostCommentedEvents };
  },
};
