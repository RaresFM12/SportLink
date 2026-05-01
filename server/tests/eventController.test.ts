import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/services/eventService.js', () => ({
  eventService: {
    getAll: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    join: vi.fn(),
    leave: vi.fn()
  }
}));

vi.mock('../src/utils/pagination.js', () => ({
  parsePagination: vi.fn()
}));

vi.mock('../src/validators/eventValidator.js', () => ({
  validateCreateEventInput: vi.fn(),
  validateUpdateEventInput: vi.fn(),
  validateUserName: vi.fn()
}));

import { eventController } from '../src/controllers/eventController.js';
import { eventService } from '../src/services/eventService.js';
import { parsePagination } from '../src/utils/pagination.js';
import {
  validateCreateEventInput,
  validateUpdateEventInput,
  validateUserName
} from '../src/validators/eventValidator.js';

function createResponseMock() {
  const response: any = {};
  response.status = vi.fn().mockReturnValue(response);
  response.json = vi.fn().mockReturnValue(response);
  response.send = vi.fn().mockReturnValue(response);
  return response;
}

describe('eventController', () => {
  const next = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getAll returns 200 with parsed pagination and filters', () => {
    const req: any = {
      query: {
        page: '2',
        limit: '3',
        sport: 'Football',
        date: '2026-05-01',
        location: 'Cluj',
        joinedOnly: 'true',
        user: 'Bianca'
      }
    };
    const res = createResponseMock();
    const pagination = { page: 2, limit: 3 };
    const result = { items: [{ id: 1 }], totalItems: 1, totalPages: 1, page: 2, limit: 3 };

    vi.mocked(parsePagination).mockReturnValue(pagination as any);
    vi.mocked(eventService.getAll).mockReturnValue(result as any);

    eventController.getAll(req, res, next);

    expect(parsePagination).toHaveBeenCalledWith('2', '3');
    expect(eventService.getAll).toHaveBeenCalledWith(
      {
        sport: 'Football',
        date: '2026-05-01',
        location: 'Cluj',
        joinedOnly: true,
        user: 'Bianca'
      },
      pagination
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(result);
    expect(next).not.toHaveBeenCalled();
  });

  it('getAll sends joinedOnly false when query value is not "true"', () => {
    const req: any = {
      query: {
        page: undefined,
        limit: undefined,
        joinedOnly: 'false'
      }
    };
    const res = createResponseMock();

    vi.mocked(parsePagination).mockReturnValue({ page: 1, limit: 10 } as any);
    vi.mocked(eventService.getAll).mockReturnValue({ items: [] } as any);

    eventController.getAll(req, res, next);

    expect(eventService.getAll).toHaveBeenCalledWith(
      {
        sport: undefined,
        date: undefined,
        location: undefined,
        joinedOnly: false,
        user: undefined
      },
      { page: 1, limit: 10 }
    );
  });

  it('getAll forwards thrown errors to next', () => {
    const req: any = { query: {} };
    const res = createResponseMock();
    const error = new Error('pagination failed');

    vi.mocked(parsePagination).mockImplementation(() => {
      throw error;
    });

    eventController.getAll(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });

  it('getById returns 200 with the found event', () => {
    const req: any = { params: { id: '7' } };
    const res = createResponseMock();
    const event = { id: 7, title: 'Test event' };

    vi.mocked(eventService.getById).mockReturnValue(event as any);

    eventController.getById(req, res, next);

    expect(eventService.getById).toHaveBeenCalledWith(7);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(event);
  });

  it('getById forwards error when id is missing', () => {
    const req: any = { params: {} };
    const res = createResponseMock();

    eventController.getById(req, res, next);

    expect(next).toHaveBeenCalled();
    expect((next.mock.calls[0] as any[])[0].message).toBe('Event id is required.');
  });

  it('getById forwards error when id is an array', () => {
    const req: any = { params: { id: ['1', '2'] } };
    const res = createResponseMock();

    eventController.getById(req, res, next);

    expect(next).toHaveBeenCalled();
    expect((next.mock.calls[0] as any[])[0].message).toBe('Event id must be a single value.');
  });

  it('getById forwards error when id is invalid', () => {
    const req: any = { params: { id: '0' } };
    const res = createResponseMock();

    eventController.getById(req, res, next);

    expect(next).toHaveBeenCalled();
    expect((next.mock.calls[0] as any[])[0].message).toBe('Event id must be a positive integer.');
  });

  it('create validates body, creates event and returns 201', () => {
    const req: any = { body: { title: 'New event' } };
    const res = createResponseMock();
    const created = { id: 9, title: 'New event' };

    vi.mocked(eventService.create).mockReturnValue(created as any);

    eventController.create(req, res, next);

    expect(validateCreateEventInput).toHaveBeenCalledWith(req.body);
    expect(eventService.create).toHaveBeenCalledWith(req.body);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(created);
  });

  it('create forwards validation errors to next', () => {
    const req: any = { body: {} };
    const res = createResponseMock();
    const error = new Error('invalid create');

    vi.mocked(validateCreateEventInput).mockImplementation(() => {
      throw error;
    });

    eventController.create(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });

  it('update validates body, updates event and returns 200', () => {
    const req: any = { params: { id: '3' }, body: { title: 'Updated' } };
    const res = createResponseMock();
    const updated = { id: 3, title: 'Updated' };

    vi.mocked(eventService.update).mockReturnValue(updated as any);

    eventController.update(req, res, next);

    expect(validateUpdateEventInput).toHaveBeenCalledWith(req.body);
    expect(eventService.update).toHaveBeenCalledWith(3, req.body);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(updated);
  });

  it('update forwards errors to next', () => {
    const req: any = { params: { id: '3' }, body: {} };
    const res = createResponseMock();
    const error = new Error('invalid update');

    vi.mocked(validateUpdateEventInput).mockImplementation(() => {
      throw error;
    });

    eventController.update(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });

  it('remove deletes event and returns 204', () => {
    const req: any = { params: { id: '5' } };
    const res = createResponseMock();

    eventController.remove(req, res, next);

    expect(eventService.remove).toHaveBeenCalledWith(5);
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalled();
  });

  it('remove forwards errors to next', () => {
    const req: any = { params: { id: 'abc' } };
    const res = createResponseMock();

    eventController.remove(req, res, next);

    expect(next).toHaveBeenCalled();
    expect((next.mock.calls[0] as any[])[0].message).toBe('Event id must be a positive integer.');
  });

  it('join validates username, joins event and returns 200', () => {
    const req: any = { params: { id: '4' }, body: { userName: 'Rares' } };
    const res = createResponseMock();
    const joined = { id: 4, participants: ['Rares'] };

    vi.mocked(validateUserName).mockReturnValue('Rares');
    vi.mocked(eventService.join).mockReturnValue(joined as any);

    eventController.join(req, res, next);

    expect(validateUserName).toHaveBeenCalledWith(req.body);
    expect(eventService.join).toHaveBeenCalledWith(4, 'Rares');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(joined);
  });

  it('join forwards errors to next', () => {
    const req: any = { params: { id: '4' }, body: {} };
    const res = createResponseMock();
    const error = new Error('invalid user');

    vi.mocked(validateUserName).mockImplementation(() => {
      throw error;
    });

    eventController.join(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });

  it('leave validates username, leaves event and returns 200', () => {
    const req: any = { params: { id: '4' }, body: { userName: 'Bianca' } };
    const res = createResponseMock();
    const left = { id: 4, participants: [] };

    vi.mocked(validateUserName).mockReturnValue('Bianca');
    vi.mocked(eventService.leave).mockReturnValue(left as any);

    eventController.leave(req, res, next);

    expect(validateUserName).toHaveBeenCalledWith(req.body);
    expect(eventService.leave).toHaveBeenCalledWith(4, 'Bianca');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(left);
  });

  it('leave forwards errors to next', () => {
    const req: any = { params: { id: '4' }, body: null };
    const res = createResponseMock();
    const error = new Error('invalid user');

    vi.mocked(validateUserName).mockImplementation(() => {
      throw error;
    });

    eventController.leave(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});