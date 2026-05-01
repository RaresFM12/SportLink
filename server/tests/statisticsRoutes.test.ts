import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/controllers/statisticsController.js', () => ({
  statisticsController: {
    get: vi.fn()
  }
}));

import { statisticsRoutes } from '../src/routes/statisticsRoutes.js';
import { statisticsController } from '../src/controllers/statisticsController.js';

describe('statisticsRoutes', () => {
  it('registers the statistics endpoint', () => {
    const routes = statisticsRoutes.stack
      .filter((layer: any) => layer.route)
      .map((layer: any) => ({
        path: layer.route.path,
        methods: layer.route.methods,
        stack: layer.route.stack
      }));

    expect(routes).toHaveLength(1);
    expect(routes[0].path).toBe('/');
    expect(routes[0].methods).toEqual({ get: true });
    expect(routes[0].stack[0].handle).toBe(statisticsController.get);
  });
});