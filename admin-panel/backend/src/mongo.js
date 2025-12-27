import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

let client = null;
let db = null;

export async function connectMongo() {
  if (client) {
    return db;
  }

  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017';
  const dbName = process.env.MONGO_DB || 'esp32_car';

  try {
    client = new MongoClient(uri);
    await client.connect();
    db = client.db(dbName);
    console.log(`[MongoDB] Connected to ${uri}/${dbName}`);
    return db;
  } catch (error) {
    console.error('[MongoDB] Connection error:', error);
    throw error;
  }
}

export function getDb() {
  if (!db) {
    throw new Error('MongoDB not connected. Call connectMongo() first.');
  }
  return db;
}

export async function closeMongo() {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log('[MongoDB] Connection closed');
  }
}

