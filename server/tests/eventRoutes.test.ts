import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/controllers/eventController.js', () => ({
  eventController: {
    getAll: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    join: vi.fn(),
    leave: vi.fn()
  }
}));

import { eventRoutes } from '../src/routes/eventRoutes.js';
import { eventController } from '../src/controllers/eventController.js';

describe('eventRoutes', () => {
  it('registers all event endpoints with the correct HTTP methods and handlers', () => {
    const routes = eventRoutes.stack
      .filter((layer: any) => layer.route)
      .map((layer: any) => ({
        path: layer.route.path,
        methods: layer.route.methods,
        stack: layer.route.stack
      }));

    expect(routes).toHaveLength(7);

    expect(routes[0].path).toBe('/');
    expect(routes[0].methods).toEqual({ get: true });
    expect(routes[0].stack[0].handle).toBe(eventController.getAll);

    expect(routes[1].path).toBe('/:id');
    expect(routes[1].methods).toEqual({ get: true });
    expect(routes[1].stack[0].handle).toBe(eventController.getById);

    expect(routes[2].path).toBe('/');
    expect(routes[2].methods).toEqual({ post: true });
    expect(routes[2].stack[0].handle).toBe(eventController.create);

    expect(routes[3].path).toBe('/:id');
    expect(routes[3].methods).toEqual({ put: true });
    expect(routes[3].stack[0].handle).toBe(eventController.update);

    expect(routes[4].path).toBe('/:id');
    expect(routes[4].methods).toEqual({ delete: true });
    expect(routes[4].stack[0].handle).toBe(eventController.remove);

    expect(routes[5].path).toBe('/:id/join');
    expect(routes[5].methods).toEqual({ post: true });
    expect(routes[5].stack[0].handle).toBe(eventController.join);

    expect(routes[6].path).toBe('/:id/leave');
    expect(routes[6].methods).toEqual({ post: true });
    expect(routes[6].stack[0].handle).toBe(eventController.leave);
  });
});