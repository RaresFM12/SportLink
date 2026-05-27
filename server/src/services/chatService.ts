import type { ObjectId } from 'mongodb';
import { getMongo } from '../lib/mongo.js';
import type { SessionUser } from './authService.js';

export type ChatMessage = {
  _id?: ObjectId;
  userId: number;
  username: string;
  displayName: string;
  role: string;
  text: string;
  createdAt: Date;
};

// Shape stored in Mongo — _id is always present after insert
type StoredChatMessage = ChatMessage & { _id: ObjectId };

const COLLECTION = 'messages';

export const chatService = {
  async saveMessage(user: SessionUser, text: string): Promise<ChatMessage> {
    const db = getMongo();
    const message: Omit<ChatMessage, '_id'> = {
      userId: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      text: text.trim(),
      createdAt: new Date(),
    };
    const result = await db
      .collection<Omit<ChatMessage, '_id'>>(COLLECTION)
      .insertOne(message);
    return { ...message, _id: result.insertedId };
  },

  async getHistory(limit = 50): Promise<ChatMessage[]> {
    const db = getMongo();
    const docs = await db
      .collection<StoredChatMessage>(COLLECTION)
      .find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
    return docs.reverse();
  },
};
