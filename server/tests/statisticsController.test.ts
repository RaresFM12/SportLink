import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/services/statisticsService.js', () => ({
  statisticsService: {
    getStatistics: vi.fn()
  }
}));

import { statisticsController } from '../src/controllers/statisticsController.js';
import { statisticsService } from '../src/services/statisticsService.js';

function createResponseMock() {
  const response: any = {};
  response.status = vi.fn().mockReturnValue(response);
  response.json = vi.fn().mockReturnValue(response);
  return response;
}

describe('statisticsController', () => {
  const next = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 with statistics payload', () => {
    const req: any = {};
    const res = createResponseMock();
    const payload = {
      sports: [{ sport: 'Football', count: 2 }],
      locations: [{ location: 'Arena', count: 2 }],
      dates: [{ date: '2026-05-01', count: 2 }]
    };

    vi.mocked(statisticsService.getStatistics).mockReturnValue(payload as any);

    statisticsController.get(req, res, next);

    expect(statisticsService.getStatistics).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(payload);
  });

  it('forwards errors to next', () => {
    const req: any = {};
    const res = createResponseMock();
    const error = new Error('stats failed');

    vi.mocked(statisticsService.getStatistics).mockImplementation(() => {
      throw error;
    });

    statisticsController.get(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});