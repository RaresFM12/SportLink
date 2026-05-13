import type { Request, Response, NextFunction } from 'express';
import { eventService } from '../services/eventService.js';
import { parsePagination } from '../utils/pagination.js';
import { validateCreateEventInput, validateUpdateEventInput, validateUserName } from '../validators/eventValidator.js';

function parseEventId(idParam: string | string[] | undefined): number {
  if (!idParam) {
    throw new Error('Event id is required.');
  }

  if (Array.isArray(idParam)) {
    throw new Error('Event id must be a single value.');
  }

  const id = Number(idParam);

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error('Event id must be a positive integer.');
  }

  return id;
}

export const eventController = {
  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const pagination = parsePagination(req.query.page as string | undefined, req.query.limit as string | undefined);
      const filters = {
        sport: req.query.sport as string | undefined,
        date: req.query.date as string | undefined,
        location: req.query.location as string | undefined,
        joinedOnly: req.query.joinedOnly === 'true',
        user: req.query.user as string | undefined,
        createdByUserId: req.query.createdByUserId ? Number(req.query.createdByUserId) : undefined,
      };

      const result = await eventService.getAll(filters, pagination);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const event = await eventService.getById(parseEventId(req.params.id));
      res.status(200).json(event);
    } catch (error) {
      next(error);
    }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      validateCreateEventInput(req.body);
      const event = await eventService.create(req.body, req.session.user);
      res.status(201).json(event);
    } catch (error) {
      next(error);
    }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      validateUpdateEventInput(req.body);
      const event = await eventService.update(parseEventId(req.params.id), req.body, req.session.user);
      res.status(200).json(event);
    } catch (error) {
      next(error);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await eventService.remove(parseEventId(req.params.id), req.session.user);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },

  async join(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userName = validateUserName(req.body);
      const event = await eventService.join(parseEventId(req.params.id), userName);
      res.status(200).json(event);
    } catch (error) {
      next(error);
    }
  },

  async leave(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userName = validateUserName(req.body);
      const event = await eventService.leave(parseEventId(req.params.id), userName);
      res.status(200).json(event);
    } catch (error) {
      next(error);
    }
  }
};
