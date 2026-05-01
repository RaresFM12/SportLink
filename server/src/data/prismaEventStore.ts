import { prisma } from '../lib/prisma.js';
import type {
  CreateEventInput,
  EventFilters,
  EventItem,
  PaginatedResponse,
  PaginationParams,
} from '../types/event.js';

// ─── shape returned by Prisma when we include participants ────────────────────
type EventWithParticipants = {
  id: number;
  title: string;
  sport: string;
  city: string;
  date: string;
  startTime: string;
  duration: string;
  location: string;
  maxParticipants: number;
  description: string;
  participants: { userName: string }[];
};

// Map a Prisma row → domain EventItem.
// currentParticipants is derived from the participants array — never stored.
function toEventItem(row: EventWithParticipants): EventItem {
  const participantNames = row.participants.map((p) => p.userName);
  return {
    id: row.id,
    title: row.title,
    sport: row.sport,
    city: row.city,
    date: row.date,
    startTime: row.startTime,
    duration: row.duration,
    location: row.location,
    maxParticipants: row.maxParticipants,
    currentParticipants: participantNames.length,
    description: row.description,
    participants: participantNames,
  };
}

// Shared include clause so every query fetches participants consistently.
const includeParticipants = { participants: { select: { userName: true } } } as const;

// ─── Build a Prisma WHERE clause from EventFilters ────────────────────────────
function buildWhere(filters: EventFilters) {
  return {
    ...(filters.sport ? { sport: { equals: filters.sport, mode: 'insensitive' as const } } : {}),
    ...(filters.date ? { date: filters.date } : {}),
    ...(filters.location
      ? {
          OR: [
            { location: { contains: filters.location, mode: 'insensitive' as const } },
            { city: { contains: filters.location, mode: 'insensitive' as const } },
          ],
        }
      : {}),
    ...(filters.joinedOnly && filters.user
      ? { participants: { some: { userName: filters.user } } }
      : {}),
  };
}

// ─── Public store API (mirrors the old inMemoryStore surface) ─────────────────
export const prismaEventStore = {
  async getAll(
    filters: EventFilters,
    pagination: PaginationParams
  ): Promise<PaginatedResponse<EventItem>> {
    const where = buildWhere(filters);
    const { page, limit } = pagination;

    const [totalItems, rows] = await prisma.$transaction([
      prisma.event.count({ where }),
      prisma.event.findMany({
        where,
        include: includeParticipants,
        orderBy: { id: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / limit);

    return {
      items: rows.map(toEventItem),
      page,
      limit,
      totalItems,
      totalPages,
    };
  },

  async getById(id: number): Promise<EventItem | null> {
    const row = await prisma.event.findUnique({
      where: { id },
      include: includeParticipants,
    });
    return row ? toEventItem(row) : null;
  },

  async create(data: CreateEventInput): Promise<EventItem> {
    const row = await prisma.event.create({
      data: {
        title: data.title,
        sport: data.sport,
        city: data.city,
        date: data.date,
        startTime: data.startTime,
        duration: data.duration,
        location: data.location,
        maxParticipants: data.maxParticipants,
        description: data.description,
        participants: {
          create: data.participants.map((userName) => ({ userName })),
        },
      },
      include: includeParticipants,
    });
    return toEventItem(row);
  },

  async update(id: number, data: Partial<CreateEventInput>): Promise<EventItem | null> {
    // If participants are being updated we delete existing ones and recreate —
    // this avoids complex diff logic and keeps the Participant table consistent.
    const row = await prisma.event.update({
      where: { id },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.sport !== undefined ? { sport: data.sport } : {}),
        ...(data.city !== undefined ? { city: data.city } : {}),
        ...(data.date !== undefined ? { date: data.date } : {}),
        ...(data.startTime !== undefined ? { startTime: data.startTime } : {}),
        ...(data.duration !== undefined ? { duration: data.duration } : {}),
        ...(data.location !== undefined ? { location: data.location } : {}),
        ...(data.maxParticipants !== undefined ? { maxParticipants: data.maxParticipants } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.participants !== undefined
          ? {
              participants: {
                deleteMany: {},
                create: data.participants.map((userName) => ({ userName })),
              },
            }
          : {}),
      },
      include: includeParticipants,
    });
    return toEventItem(row);
  },

  async remove(id: number): Promise<void> {
    // Cascade delete handles participants and comments via schema onDelete: Cascade
    await prisma.event.delete({ where: { id } });
  },

  async addParticipant(eventId: number, userName: string): Promise<EventItem | null> {
    await prisma.participant.create({ data: { eventId, userName } });
    return this.getById(eventId);
  },

  async removeParticipant(eventId: number, userName: string): Promise<EventItem | null> {
    await prisma.participant.delete({
      where: { eventId_userName: { eventId, userName } },
    });
    return this.getById(eventId);
  },

  async hasParticipant(eventId: number, userName: string): Promise<boolean> {
    const row = await prisma.participant.findUnique({
      where: { eventId_userName: { eventId, userName } },
    });
    return row !== null;
  },
};
