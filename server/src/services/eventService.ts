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
import type { SessionUser } from './authService.js';
import { securityLogService } from './securityLogService.js';

function canManageEvent(user: SessionUser, event: EventItem): boolean {
  return user.role === 'ADMIN' || event.createdByUserId === user.id;
}

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

  async create(data: CreateEventInput, user?: SessionUser): Promise<EventItem> {
    return prismaEventStore.create(data, user?.id);
  },

  async update(id: number, updatedFields: UpdateEventInput, user?: SessionUser): Promise<EventItem> {
    const existing = await prismaEventStore.getById(id);
    if (!existing) throw new HttpError(404, 'Event not found.');
    if (user && !canManageEvent(user, existing)) {
      void securityLogService.markSuspicious(
        user,
        'Attempted to edit an event owned by another user',
        `Restricted event update attempt: event ${id}`
      ).catch((err) => console.error('[security-log] Failed to mark event edit attempt:', err));
      throw new HttpError(403, 'You can only edit events created by you.');
    }

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

  async remove(id: number, user?: SessionUser): Promise<void> {
    const existing = await prismaEventStore.getById(id);
    if (!existing) throw new HttpError(404, 'Event not found.');
    if (user && !canManageEvent(user, existing)) {
      void securityLogService.markSuspicious(
        user,
        'Attempted to delete an event owned by another user',
        `Restricted event delete attempt: event ${id}`
      ).catch((err) => console.error('[security-log] Failed to mark event delete attempt:', err));
      throw new HttpError(403, 'You can only delete events created by you.');
    }
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
