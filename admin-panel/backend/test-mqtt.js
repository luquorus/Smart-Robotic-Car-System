import mqtt from 'mqtt';
import dotenv from 'dotenv';

dotenv.config();

const MQTT_URL = process.env.MQTT_URL || 'mqtt://192.168.0.107:1883';
const DEVICE_ID = 'esp32_car_7E7C3C';

console.log(`[Test] Connecting to MQTT: ${MQTT_URL}`);

const client = mqtt.connect(MQTT_URL);

client.on('connect', () => {
  console.log('[Test] MQTT Connected');
  console.log('[Test] Publishing test messages...\n');

  // Publish status
  const statusTopic = `car/${DEVICE_ID}/status`;
  const statusPayload = {
    device_id: DEVICE_ID,
    status: 'online',
    timestamp_ms: Date.now()
  };
  client.publish(statusTopic, JSON.stringify(statusPayload), () => {
    console.log(`[Test] Published to ${statusTopic}:`, statusPayload);
  });

  // Publish telemetry
  const telemetryTopic = `car/${DEVICE_ID}/telemetry`;
  const telemetryPayload = {
    device_id: DEVICE_ID,
    mode: 'manual',
    motion: 'fwd',
    speed: { linear: 120, rot: 80 },
    distance_cm: 23.4,
    obstacle: false,
    line: { left: 0, center: 1, right: 0 },
    wifi_rssi: -55,
    uptime_ms: 1234567
  };
  client.publish(telemetryTopic, JSON.stringify(telemetryPayload), () => {
    console.log(`[Test] Published to ${telemetryTopic}:`, telemetryPayload);
  });

  // Publish event
  const eventTopic = `car/${DEVICE_ID}/event`;
  const eventPayload = {
    device_id: DEVICE_ID,
    event: 'obstacle',
    distance_cm: 18.2,
    timestamp_ms: Date.now()
  };
  client.publish(eventTopic, JSON.stringify(eventPayload), () => {
    console.log(`[Test] Published to ${eventTopic}:`, eventPayload);
  });

  // Keep publishing telemetry every 2 seconds
  const interval = setInterval(() => {
    const payload = {
      device_id: DEVICE_ID,
      mode: ['manual', 'line'][Math.floor(Math.random() * 2)],
      motion: ['stop', 'fwd', 'back', 'left', 'right'][Math.floor(Math.random() * 5)],
      speed: { 
        linear: Math.floor(Math.random() * 150) + 50, 
        rot: Math.floor(Math.random() * 100) + 50 
      },
      distance_cm: (Math.random() * 50 + 10).toFixed(1),
      obstacle: Math.random() > 0.7,
      line: { 
        left: Math.floor(Math.random() * 2), 
        center: Math.floor(Math.random() * 2), 
        right: Math.floor(Math.random() * 2) 
      },
      wifi_rssi: Math.floor(Math.random() * 30) - 70,
      uptime_ms: Date.now()
    };
    client.publish(telemetryTopic, JSON.stringify(payload), () => {
      console.log(`[Test] Published telemetry: distance=${payload.distance_cm}cm, obstacle=${payload.obstacle}`);
    });
  }, 2000);

  // Stop after 30 seconds
  setTimeout(() => {
    clearInterval(interval);
    console.log('\n[Test] Stopping test publisher...');
    client.end();
    process.exit(0);
  }, 30000);
});

client.on('error', (error) => {
  console.error('[Test] MQTT Error:', error);
  process.exit(1);
});

client.on('close', () => {
  console.log('[Test] MQTT Connection closed');
});

