import { prismaEventStore } from '../data/prismaEventStore.js';
import type {
  CreateEventInput,
  EventFilters,
  EventItem,
  PaginatedResponse,
  PaginationParams,
  UpdateEventInput,
} from '../types/event.js';
import { HttpError } from '../utils/httpErrors.js';

export const eventService = {
  async getAll(
    filters: EventFilters,
    pagination: PaginationParams
  ): Promise<PaginatedResponse<EventItem>> {
    return prismaEventStore.getAll(filters, pagination);
  },

  async getById(id: number): Promise<EventItem> {
    const event = await prismaEventStore.getById(id);
    if (!event) throw new HttpError(404, 'Event not found.');
    return event;
  },

  async create(data: CreateEventInput): Promise<EventItem> {
    return prismaEventStore.create(data);
  },

  async update(id: number, updatedFields: UpdateEventInput): Promise<EventItem> {
    const existing = await prismaEventStore.getById(id);
    if (!existing) throw new HttpError(404, 'Event not found.');

    const nextParticipants = updatedFields.participants ?? existing.participants;
    const nextMaxParticipants = updatedFields.maxParticipants ?? existing.maxParticipants;

    if (nextParticipants.length > nextMaxParticipants) {
      throw new HttpError(400, 'Maximum participants cannot be lower than current participants.');
    }

    const updated = await prismaEventStore.update(id, {
      ...updatedFields,
      participants: nextParticipants,
    });

    if (!updated) throw new HttpError(404, 'Event not found.');
    return updated;
  },

  async remove(id: number): Promise<void> {
    const existing = await prismaEventStore.getById(id);
    if (!existing) throw new HttpError(404, 'Event not found.');
    await prismaEventStore.remove(id);
  },

  async join(id: number, userName: string): Promise<EventItem> {
    const event = await prismaEventStore.getById(id);
    if (!event) throw new HttpError(404, 'Event not found.');

    const alreadyJoined = await prismaEventStore.hasParticipant(id, userName);
    if (alreadyJoined) throw new HttpError(409, 'User already joined this event.');

    if (event.currentParticipants >= event.maxParticipants) {
      throw new HttpError(409, 'Event is full.');
    }

    const updated = await prismaEventStore.addParticipant(id, userName);
    if (!updated) throw new HttpError(404, 'Event not found.');
    return updated;
  },

  async leave(id: number, userName: string): Promise<EventItem> {
    const event = await prismaEventStore.getById(id);
    if (!event) throw new HttpError(404, 'Event not found.');

    const isParticipant = await prismaEventStore.hasParticipant(id, userName);
    if (!isParticipant) throw new HttpError(409, 'User is not part of this event.');

    const updated = await prismaEventStore.removeParticipant(id, userName);
    if (!updated) throw new HttpError(404, 'Event not found.');
    return updated;
  },
};
