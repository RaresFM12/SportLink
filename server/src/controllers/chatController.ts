import type { Request, Response, NextFunction } from 'express';
import { chatService } from '../services/chatService.js';

export const chatController = {
  async getHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = Number(req.query.limit ?? 50);
      const messages = await chatService.getHistory(limit);
      res.status(200).json(messages);
    } catch (error) {
      next(error);
    }
  },
};
