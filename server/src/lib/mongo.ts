import { MongoClient, type Db } from 'mongodb';

const MONGO_URL = process.env.MONGO_URL ?? 'mongodb://localhost:27017';
const MONGO_DB  = process.env.MONGO_DB  ?? 'sportlink_chat';

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectMongo(): Promise<Db> {
  if (db) return db;
  client = new MongoClient(MONGO_URL);
  await client.connect();
  db = client.db(MONGO_DB);
  console.log(`MongoDB connected: ${MONGO_URL}/${MONGO_DB}`);
  return db;
}

export function getMongo(): Db {
  if (!db) throw new Error('MongoDB not connected. Call connectMongo() first.');
  return db;
}

export async function disconnectMongo(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}
