import { getDb } from './mongo.js';
import { ObjectId } from 'mongodb';

export async function ensureIndexes() {
  const db = getDb();

  try {
    // Telemetry indexes
    await db.collection('telemetry').createIndex(
      { device_id: 1, ts: -1 },
      { name: 'device_id_ts_idx' }
    );

    // Events indexes
    await db.collection('events').createIndex(
      { device_id: 1, ts: -1 },
      { name: 'device_id_ts_idx' }
    );

    // Status indexes
    await db.collection('status').createIndex(
      { device_id: 1, ts: -1 },
      { name: 'device_id_ts_idx' }
    );

    // Users indexes
    await db.collection('users').createIndex(
      { username: 1 },
      { unique: true, name: 'username_unique_idx' }
    );
    await db.collection('users').createIndex(
      { email: 1 },
      { sparse: true, name: 'email_idx' }
    );

    console.log('[Indexes] All indexes created/verified');
  } catch (error) {
    console.error('[Indexes] Error creating indexes:', error);
    throw error;
  }
}

