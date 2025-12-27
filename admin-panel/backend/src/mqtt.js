import mqtt from 'mqtt';
import dotenv from 'dotenv';
import { getDb } from './mongo.js';

dotenv.config();

let mqttClient = null;
let deviceLastSeen = new Map(); // Track last seen time for each device
let offlineCheckInterval = null;
const OFFLINE_TIMEOUT_MS = parseInt(process.env.OFFLINE_TIMEOUT_MS || '25000'); // Default 25 seconds (2.5x ESP32 interval)

export function startMqtt(io) {
  const mqttUrl = process.env.MQTT_URL || 'mqtt://192.168.0.107:1883';

  console.log(`[MQTT] Connecting to ${mqttUrl}`);

  mqttClient = mqtt.connect(mqttUrl, {
    reconnectPeriod: 5000,
    connectTimeout: 30000,
  });

  mqttClient.on('connect', () => {
    console.log('[MQTT] Connected');

    // Subscribe to all required topics
    mqttClient.subscribe('car/+/telemetry', (err) => {
      if (err) {
        console.error('[MQTT] Subscribe error (telemetry):', err);
      } else {
        console.log('[MQTT] Subscribed to car/+/telemetry');
      }
    });

    mqttClient.subscribe('car/+/event', (err) => {
      if (err) {
        console.error('[MQTT] Subscribe error (event):', err);
      } else {
        console.log('[MQTT] Subscribed to car/+/event');
      }
    });

    mqttClient.subscribe('car/+/status', (err) => {
      if (err) {
        console.error('[MQTT] Subscribe error (status):', err);
      } else {
        console.log('[MQTT] Subscribed to car/+/status');
      }
    });
  });

  mqttClient.on('message', async (topic, message) => {
    try {
      const payload = JSON.parse(message.toString());
      const db = getDb();
      const ts = new Date();

      // Extract device_id from topic if not in payload
      // Topic format: car/{device_id}/telemetry|event|status
      let deviceId = payload.device_id;
      if (!deviceId && topic.startsWith('car/')) {
        const topicParts = topic.split('/');
        if (topicParts.length >= 2) {
          deviceId = topicParts[1];
          payload.device_id = deviceId; // Add to payload
        }
      }

      if (!deviceId) {
        console.warn('[MQTT] No device_id found in payload or topic:', topic);
        return;
      }

      // Add server fields
      const doc = {
        ...payload,
        device_id: deviceId, // Ensure device_id is set
        ts,
        topic,
      };

      let collectionName = null;
      let socketEvent = null;

      if (topic.includes('/telemetry')) {
        collectionName = 'telemetry';
        socketEvent = 'telemetry';
      } else if (topic.includes('/event')) {
        collectionName = 'events';
        socketEvent = 'event';
      } else if (topic.includes('/status')) {
        collectionName = 'status';
        socketEvent = 'status';
      }

      if (collectionName) {
        // Update last seen time for device
        deviceLastSeen.set(deviceId, ts);

        // If device was offline, mark as online
        const lastStatus = await db.collection('status')
          .findOne(
            { device_id: deviceId },
            { sort: { ts: -1 } }
          );

        if (lastStatus && lastStatus.status === 'offline') {
          // Device came back online, insert online status
          const onlineStatus = {
            device_id: deviceId,
            status: 'online',
            timestamp_ms: ts.getTime(),
            ts,
            topic: `car/${deviceId}/status`,
          };
          try {
            await db.collection('status').insertOne(onlineStatus);
            if (io) {
              io.emit('status', onlineStatus);
            }
            console.log(`[MQTT] Device ${deviceId} came back online`);
          } catch (err) {
            console.error(`[MQTT] Error inserting online status:`, err);
          }
        }

        // Insert to MongoDB
        try {
          await db.collection(collectionName).insertOne(doc);
          console.log(`[MQTT] Inserted to ${collectionName}: device_id=${deviceId}`);

          // Emit via Socket.IO
          if (io && socketEvent) {
            io.emit(socketEvent, doc);
          }
        } catch (dbError) {
          console.error(`[MQTT] DB insert error (${collectionName}):`, dbError);
        }
      }
    } catch (parseError) {
      console.error('[MQTT] JSON parse error:', parseError);
      console.error('[MQTT] Raw message:', message.toString());
    }
  });

  mqttClient.on('error', (error) => {
    console.error('[MQTT] Error:', error);
  });

  mqttClient.on('close', () => {
    console.log('[MQTT] Connection closed');
  });

  mqttClient.on('reconnect', () => {
    console.log('[MQTT] Reconnecting...');
  });

  mqttClient.on('offline', () => {
    console.log('[MQTT] Client offline');
  });

  // Start offline detection interval
  startOfflineDetection(io);

  return mqttClient;
}

// Check for offline devices periodically
async function checkOfflineDevices(io) {
  const now = new Date();
  const db = getDb();

  // Check devices that we've seen (in deviceLastSeen map)
  for (const [deviceId, lastSeen] of deviceLastSeen.entries()) {
    const timeSinceLastSeen = now - lastSeen;

    if (timeSinceLastSeen > OFFLINE_TIMEOUT_MS) {
      await markDeviceOffline(deviceId, now, timeSinceLastSeen, io, db);
    }
  }

  // Also check devices in DB that might be offline (not in deviceLastSeen)
  // This handles devices that were online before server restart
  try {
    const allDevices = await db.collection('status')
      .aggregate([
        { $sort: { ts: -1 } },
        { $group: { _id: '$device_id', last_ts: { $first: '$ts' }, status: { $first: '$status' } } }
      ])
      .toArray();

    for (const device of allDevices) {
      const deviceId = device._id;
      const lastStatus = device.status;
      const lastTs = device.last_ts;

      // Skip if already tracked in deviceLastSeen (handled above)
      if (deviceLastSeen.has(deviceId)) {
        continue;
      }

      // If device was online and last seen > timeout, mark offline
      if (lastStatus === 'online') {
        const timeSinceLastSeen = now - new Date(lastTs);
        if (timeSinceLastSeen > OFFLINE_TIMEOUT_MS) {
          await markDeviceOffline(deviceId, now, timeSinceLastSeen, io, db);
        }
      }
    }
  } catch (err) {
    console.error('[MQTT] Error checking DB devices for offline status:', err);
  }
}

async function markDeviceOffline(deviceId, now, timeSinceLastSeen, io, db) {
  // Check current status
  const lastStatus = await db.collection('status')
    .findOne(
      { device_id: deviceId },
      { sort: { ts: -1 } }
    );

  // Only mark offline if current status is not already offline
  if (!lastStatus || lastStatus.status !== 'offline') {
    const offlineStatus = {
      device_id: deviceId,
      status: 'offline',
      timestamp_ms: now.getTime(),
      ts: now,
      topic: `car/${deviceId}/status`,
    };

    try {
      await db.collection('status').insertOne(offlineStatus);
      if (io) {
        io.emit('status', offlineStatus);
      }
      console.log(`[MQTT] Device ${deviceId} marked as offline (last seen: ${Math.floor(timeSinceLastSeen / 1000)}s ago)`);
    } catch (err) {
      console.error(`[MQTT] Error inserting offline status:`, err);
    }
  }
}

function startOfflineDetection(io) {
  // Check immediately on start (for devices already offline)
  checkOfflineDevices(io).catch((err) => {
    console.error('[MQTT] Error in initial offline check:', err);
  });

  // Then check every 10 seconds
  offlineCheckInterval = setInterval(() => {
    checkOfflineDevices(io).catch((err) => {
      console.error('[MQTT] Error checking offline devices:', err);
    });
  }, 10000);

  console.log(`[MQTT] Offline detection started (timeout: ${OFFLINE_TIMEOUT_MS / 1000}s, check interval: 10s)`);
}

export function stopOfflineDetection() {
  if (offlineCheckInterval) {
    clearInterval(offlineCheckInterval);
    offlineCheckInterval = null;
    console.log('[MQTT] Offline detection stopped');
  }
}

export function getMqttClient() {
  return mqttClient;
}

