import { GraphQLError } from 'graphql';
import { eventService } from '../services/eventService.js';
import { statisticsService } from '../services/statisticsService.js';
import { generatorService } from '../services/generatorService.js';
import { commentService } from '../services/commentService.js';
import { validateCreateEventInput, validateUpdateEventInput } from '../validators/eventValidator.js';
import { HttpError } from '../utils/httpErrors.js';
import type { EventItem } from '../types/event.js';

function toGraphQLError(err: unknown): never {
  if (err instanceof HttpError) {
    const code =
      err.statusCode === 404 ? 'NOT_FOUND'
      : err.statusCode === 409 ? 'CONFLICT'
      : 'BAD_USER_INPUT';
    throw new GraphQLError(err.message, { extensions: { code } });
  }
  if (err instanceof Error) {
    throw new GraphQLError(err.message, { extensions: { code: 'BAD_USER_INPUT' } });
  }
  throw new GraphQLError('An unexpected error occurred.');
}

export const resolvers = {
  Query: {
    async events(
      _: unknown,
      args: {
        page?: number;
        limit?: number;
        sport?: string;
        date?: string;
        location?: string;
        joinedOnly?: boolean;
        user?: string;
      }
    ) {
      try {
        return await eventService.getAll(
          {
            sport: args.sport,
            date: args.date,
            location: args.location,
            joinedOnly: args.joinedOnly ?? false,
            user: args.user,
          },
          {
            page: args.page && args.page > 0 ? args.page : 1,
            limit: args.limit && args.limit > 0 ? args.limit : 5,
          }
        );
      } catch (err) {
        toGraphQLError(err);
      }
    },

    async event(_: unknown, args: { id: number }) {
      try {
        return await eventService.getById(args.id);
      } catch (err) {
        if (err instanceof HttpError && err.statusCode === 404) return null;
        toGraphQLError(err);
      }
    },

    async statistics() {
      try {
        return await statisticsService.getStatistics();
      } catch (err) {
        toGraphQLError(err);
      }
    },

    generatorStatus() {
      return generatorService.getStatus();
    },

    async commentsByEvent(_: unknown, args: { eventId: number }) {
      try {
        return await commentService.getByEventId(args.eventId);
      } catch (err) {
        toGraphQLError(err);
      }
    },
  },

  Mutation: {
    async createEvent(_: unknown, args: { input: unknown }) {
      try {
        validateCreateEventInput(args.input);
        return await eventService.create(args.input);
      } catch (err) {
        toGraphQLError(err);
      }
    },

    async updateEvent(_: unknown, args: { id: number; input: unknown }) {
      try {
        validateUpdateEventInput(args.input);
        return await eventService.update(
          args.id,
          args.input as Parameters<typeof eventService.update>[1]
        );
      } catch (err) {
        toGraphQLError(err);
      }
    },

    async deleteEvent(_: unknown, args: { id: number }) {
      try {
        await eventService.remove(args.id);
        return true;
      } catch (err) {
        toGraphQLError(err);
      }
    },

    async joinEvent(_: unknown, args: { id: number; userName: string }) {
      try {
        return await eventService.join(args.id, args.userName);
      } catch (err) {
        toGraphQLError(err);
      }
    },

    async leaveEvent(_: unknown, args: { id: number; userName: string }) {
      try {
        return await eventService.leave(args.id, args.userName);
      } catch (err) {
        toGraphQLError(err);
      }
    },

    startGenerator(_: unknown, args: { batchSize?: number; intervalMs?: number }) {
      return generatorService.start(args.batchSize ?? 3, args.intervalMs ?? 4000);
    },

    stopGenerator() {
      return generatorService.stop();
    },

    async createComment(
      _: unknown,
      args: { input: { eventId: number; author: string; content: string } }
    ) {
      try {
        return await commentService.create(args.input);
      } catch (err) {
        toGraphQLError(err);
      }
    },

    async updateComment(_: unknown, args: { id: number; input: { content: string } }) {
      try {
        return await commentService.update(args.id, args.input);
      } catch (err) {
        toGraphQLError(err);
      }
    },

    async deleteComment(_: unknown, args: { id: number }) {
      try {
        await commentService.remove(args.id);
        return true;
      } catch (err) {
        toGraphQLError(err);
      }
    },
  },

  EventItem: {
    async comments(parent: EventItem) {
      return commentService.getByEventId(parent.id);
    },
  },
};
