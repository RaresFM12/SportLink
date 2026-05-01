import { prisma } from '../lib/prisma.js';
import type { Comment } from '../types/comment.js';

// Map Prisma Comment row → domain Comment (createdAt as ISO string)
function toComment(row: {
  id: number;
  eventId: number;
  author: string;
  content: string;
  createdAt: Date;
}): Comment {
  return {
    id: row.id,
    eventId: row.eventId,
    author: row.author,
    content: row.content,
    createdAt: row.createdAt.toISOString(),
  };
}

export const prismaCommentStore = {
  async getAll(): Promise<Comment[]> {
    const rows = await prisma.comment.findMany({ orderBy: { createdAt: 'asc' } });
    return rows.map(toComment);
  },

  async getByEventId(eventId: number): Promise<Comment[]> {
    const rows = await prisma.comment.findMany({
      where: { eventId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toComment);
  },

  async getById(id: number): Promise<Comment | null> {
    const row = await prisma.comment.findUnique({ where: { id } });
    return row ? toComment(row) : null;
  },

  async add(data: Omit<Comment, 'id' | 'createdAt'>): Promise<Comment> {
    const row = await prisma.comment.create({
      data: {
        eventId: data.eventId,
        author: data.author,
        content: data.content,
      },
    });
    return toComment(row);
  },

  async update(id: number, content: string): Promise<Comment | null> {
    const row = await prisma.comment.update({
      where: { id },
      data: { content },
    });
    return toComment(row);
  },

  async remove(id: number): Promise<void> {
    await prisma.comment.delete({ where: { id } });
  },

  // Used by statistics: returns { eventId, count } pairs via SQL GROUP BY
  async countPerEvent(): Promise<Array<{ eventId: number; count: number }>> {
    const result = await prisma.comment.groupBy({
      by: ['eventId'],
      _count: { id: true },
    });
    return result.map((row) => ({ eventId: row.eventId, count: row._count.id }));
  },

  async totalCount(): Promise<number> {
    return prisma.comment.count();
  },
};
