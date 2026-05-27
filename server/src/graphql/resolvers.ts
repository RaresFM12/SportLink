import { GraphQLError } from 'graphql';
import { eventService } from '../services/eventService.js';
import { statisticsService } from '../services/statisticsService.js';
import { generatorService } from '../services/generatorService.js';
import { commentService } from '../services/commentService.js';
import { validateCreateEventInput, validateUpdateEventInput } from '../validators/eventValidator.js';
import { HttpError } from '../utils/httpErrors.js';
import type { EventItem } from '../types/event.js';
import type { GraphQLContext } from './server.js';
import { securityLogService } from '../services/securityLogService.js';

function requirePermission(ctx: GraphQLContext, action: string): void {
  if (!ctx.user) {
    throw new GraphQLError('Not authenticated.', { extensions: { code: 'UNAUTHENTICATED' } });
  }

  if (!ctx.user.permissions.includes(action)) {
    void securityLogService.markSuspicious(
      ctx.user,
      `GraphQL permission denied for ${action}`,
      `GraphQL ${action}`
    ).catch((err) => {
      console.error('[security-log] Failed to mark GraphQL suspicious user:', err);
    });
    throw new GraphQLError(`Permission denied: ${action}`, { extensions: { code: 'FORBIDDEN' } });
  }
}

function requireAnyPermission(ctx: GraphQLContext, actions: string[]): void {
  if (!ctx.user) {
    throw new GraphQLError('Not authenticated.', { extensions: { code: 'UNAUTHENTICATED' } });
  }

  if (!actions.some((action) => ctx.user?.permissions.includes(action))) {
    void securityLogService.markSuspicious(
      ctx.user,
      `GraphQL permission denied for one of: ${actions.join(', ')}`,
      `GraphQL ${actions.join(' or ')}`
    ).catch((err) => {
      console.error('[security-log] Failed to mark GraphQL suspicious user:', err);
    });
    throw new GraphQLError(`Permission denied: ${actions.join(' or ')}`, { extensions: { code: 'FORBIDDEN' } });
  }
}

function toGraphQLError(err: unknown): never {
  if (err instanceof HttpError) {
    const code =
      err.statusCode === 404 ? 'NOT_FOUND'
      : err.statusCode === 409 ? 'CONFLICT'
      : err.statusCode === 403 ? 'FORBIDDEN'
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
        createdByUserId?: number;
      },
      ctx: GraphQLContext
    ) {
      requirePermission(ctx, 'event:read');
      try {
        return await eventService.getAll(
          {
            sport: args.sport,
            date: args.date,
            location: args.location,
            joinedOnly: args.joinedOnly ?? false,
            user: args.user,
            createdByUserId: args.createdByUserId,
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

    async event(_: unknown, args: { id: number }, ctx: GraphQLContext) {
      requirePermission(ctx, 'event:read');
      try {
        return await eventService.getById(args.id);
      } catch (err) {
        if (err instanceof HttpError && err.statusCode === 404) return null;
        toGraphQLError(err);
      }
    },

    async statistics(_: unknown, _args: unknown, ctx: GraphQLContext) {
      requirePermission(ctx, 'statistics:read');
      try {
        return await statisticsService.getStatistics();
      } catch (err) {
        toGraphQLError(err);
      }
    },

    generatorStatus(_: unknown, _args: unknown, ctx: GraphQLContext) {
      requirePermission(ctx, 'statistics:read');
      return generatorService.getStatus();
    },

    async commentsByEvent(_: unknown, args: { eventId: number }, ctx: GraphQLContext) {
      requirePermission(ctx, 'event:read');
      try {
        return await commentService.getByEventId(args.eventId);
      } catch (err) {
        toGraphQLError(err);
      }
    },
  },

  Mutation: {
    async createEvent(_: unknown, args: { input: unknown }, ctx: GraphQLContext) {
      requirePermission(ctx, 'event:create');
      try {
        validateCreateEventInput(args.input);
        return await eventService.create(args.input, ctx.user);
      } catch (err) {
        toGraphQLError(err);
      }
    },

    async updateEvent(_: unknown, args: { id: number; input: unknown }, ctx: GraphQLContext) {
      requireAnyPermission(ctx, ['event:update', 'event:update:own']);
      try {
        validateUpdateEventInput(args.input);
        return await eventService.update(
          args.id,
          args.input as Parameters<typeof eventService.update>[1],
          ctx.user
        );
      } catch (err) {
        toGraphQLError(err);
      }
    },

    async deleteEvent(_: unknown, args: { id: number }, ctx: GraphQLContext) {
      requireAnyPermission(ctx, ['event:delete', 'event:delete:own']);
      try {
        await eventService.remove(args.id, ctx.user);
        return true;
      } catch (err) {
        toGraphQLError(err);
      }
    },

    async joinEvent(_: unknown, args: { id: number; userName: string }, ctx: GraphQLContext) {
      requirePermission(ctx, 'event:join');
      try {
        return await eventService.join(args.id, args.userName);
      } catch (err) {
        toGraphQLError(err);
      }
    },

    async leaveEvent(_: unknown, args: { id: number; userName: string }, ctx: GraphQLContext) {
      requirePermission(ctx, 'event:leave');
      try {
        return await eventService.leave(args.id, args.userName);
      } catch (err) {
        toGraphQLError(err);
      }
    },

    startGenerator(_: unknown, args: { batchSize?: number; intervalMs?: number }, ctx: GraphQLContext) {
      requirePermission(ctx, 'generator:start');
      return generatorService.start(args.batchSize ?? 3, args.intervalMs ?? 4000);
    },

    stopGenerator(_: unknown, _args: unknown, ctx: GraphQLContext) {
      requirePermission(ctx, 'generator:stop');
      return generatorService.stop();
    },

    async createComment(
      _: unknown,
      args: { input: { eventId: number; author: string; content: string } },
      ctx: GraphQLContext
    ) {
      requirePermission(ctx, 'comment:create');
      try {
        return await commentService.create(args.input);
      } catch (err) {
        toGraphQLError(err);
      }
    },

    async updateComment(
      _: unknown,
      args: { id: number; input: { content: string } },
      ctx: GraphQLContext
    ) {
      requirePermission(ctx, 'comment:update');
      try {
        return await commentService.update(args.id, args.input);
      } catch (err) {
        toGraphQLError(err);
      }
    },

    async deleteComment(_: unknown, args: { id: number }, ctx: GraphQLContext) {
      requirePermission(ctx, 'comment:delete');
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
