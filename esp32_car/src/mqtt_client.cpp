#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include "mqtt_client.h"
#include "do_line.h"

// Suppress deprecated warning for StaticJsonDocument (ArduinoJson v7)
// StaticJsonDocument still works fine, just deprecated in favor of JsonDocument
#pragma GCC diagnostic push
#pragma GCC diagnostic ignored "-Wdeprecated-declarations"

// ================= MQTT Configuration =================
const char* MQTT_BROKER = "192.168.0.107";
const int MQTT_PORT = 1883;
const char* MQTT_USER = "";
const char* MQTT_PASS = "";

// Telemetry publish interval (adjustable constant)
const unsigned long TELEMETRY_INTERVAL_MS = 5000; // 5 giây để tránh quá tải

// ================= MQTT Client =================
WiFiClient wifiClient;
PubSubClient mqttClient(wifiClient);

// Device ID from MAC address (last 3 bytes)
String device_id = "";

// Topic strings
String topic_telemetry = "";
String topic_event = "";
String topic_status = "";

// ================= Telemetry Timing =================
unsigned long last_telemetry_ms = 0;

// ================= Helper Functions =================
String getDeviceId() {
  if (device_id.length() == 0) {
    uint8_t mac[6];
    WiFi.macAddress(mac);
    char macStr[20];
    sprintf(macStr, "esp32_car_%02X%02X%02X", mac[3], mac[4], mac[5]);
    device_id = String(macStr);
  }
  return device_id;
}

void buildTopics() {
  String devId = getDeviceId();
  topic_telemetry = "car/" + devId + "/telemetry";
  topic_event = "car/" + devId + "/event";
  topic_status = "car/" + devId + "/status";
}

// ================= MQTT Callback =================
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  // Currently no subscriptions, but callback required by PubSubClient
  // Can be extended for remote control commands if needed
}

// ================= MQTT Reconnect =================
void mqtt_reconnect() {
  if (mqttClient.connected()) {
    return;
  }
  
  String devId = getDeviceId();
  String clientId = "ESP32Car_" + devId;
  
  Serial.print("Attempting MQTT connection...");
  
  // Attempt to connect
  bool connected = false;
  if (strlen(MQTT_USER) > 0) {
    connected = mqttClient.connect(clientId.c_str(), MQTT_USER, MQTT_PASS);
  } else {
    connected = mqttClient.connect(clientId.c_str());
  }
  
  if (connected) {
    Serial.println("connected");
    Serial.print("[MQTT] Device ID: ");
    Serial.println(devId);
    Serial.print("[MQTT] Telemetry topic: ");
    Serial.println(topic_telemetry);
    Serial.print("[MQTT] Event topic: ");
    Serial.println(topic_event);
    Serial.print("[MQTT] Status topic: ");
    Serial.println(topic_status);
    
    // Publish status
    StaticJsonDocument<128> statusDoc;
    statusDoc["device_id"] = devId;
    statusDoc["status"] = "online";
    statusDoc["timestamp"] = millis();
    
    char statusBuffer[128];
    serializeJson(statusDoc, statusBuffer);
    bool statusPublished = mqttClient.publish(topic_status.c_str(), statusBuffer);
    if (statusPublished) {
      Serial.println("[MQTT] Status published successfully");
    } else {
      Serial.println("[MQTT] ERROR: Failed to publish status!");
    }
    
  } else {
    Serial.print("failed, rc=");
    Serial.print(mqttClient.state());
    Serial.println(" try again later");
  }
}

// ================= MQTT Init =================
void mqtt_init() {
  // Build device ID and topics
  getDeviceId();
  buildTopics();
  
  // Configure MQTT client
  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);
  mqttClient.setBufferSize(512); // Increase buffer for JSON messages
  
  Serial.print("MQTT configured for device: ");
  Serial.println(device_id);
  Serial.print("Telemetry topic: ");
  Serial.println(topic_telemetry);
  Serial.print("Event topic: ");
  Serial.println(topic_event);
  Serial.print("Status topic: ");
  Serial.println(topic_status);
  
  // Initialize telemetry timing
  last_telemetry_ms = 0;
}

// ================= MQTT Loop =================
void mqtt_loop() {
  // Non-blocking: maintain connection and process incoming messages
  if (!mqttClient.connected()) {
    // Try reconnect every 5 seconds
    static unsigned long last_reconnect_attempt = 0;
    unsigned long now = millis();
    if (now - last_reconnect_attempt > 5000) {
      last_reconnect_attempt = now;
      mqtt_reconnect();
    }
  } else {
    // Process MQTT messages (non-blocking)
    mqttClient.loop();
  }
}

// ================= Publish Telemetry (Extended with state) =================
void mqtt_publishTelemetryWithState(const char* mode, const char* motion, 
                                     int speed_linear, int speed_rot) {
  if (!mqttClient.connected()) {
    return;
  }
  
  unsigned long now = millis();
  if (now - last_telemetry_ms < TELEMETRY_INTERVAL_MS) {
    return;
  }
  last_telemetry_ms = now;
  
  // Get sensor data
  float distance_cm = do_line_getDistanceCM();
  bool L2, L1, M, R1, R2;
  do_line_getLineSensors(&L2, &L1, &M, &R1, &R2);
  
  // Build JSON document
  StaticJsonDocument<512> doc;
  doc["device_id"] = device_id;
  doc["mode"] = mode;
  doc["motion"] = motion;
  doc["speed_linear"] = speed_linear;
  doc["speed_rot"] = speed_rot;
  // distance_cm: luôn gửi, -1 nếu chưa có giá trị hoặc quá xa
  doc["distance_cm"] = (distance_cm > 0) ? distance_cm : -1.0f;
  doc["obstacle"] = (distance_cm > 0 && distance_cm < 15.0f);
  doc["line"][0] = L2;
  doc["line"][1] = L1;
  doc["line"][2] = M;
  doc["line"][3] = R1;
  doc["line"][4] = R2;
  doc["wifi_rssi"] = WiFi.RSSI();
  doc["uptime_ms"] = millis();
  
  // Serialize and publish
  char buffer[512];
  serializeJson(doc, buffer);
  
  bool published = mqttClient.publish(topic_telemetry.c_str(), buffer);
  if (published) {
    Serial.print("[MQTT] Telemetry published to: ");
    Serial.println(topic_telemetry);
  } else {
    Serial.println("[MQTT] ERROR: Failed to publish telemetry!");
  }
}

// ================= Publish Obstacle Event =================
void mqtt_publishObstacleEvent(float distance_cm) {
  if (!mqttClient.connected()) {
    return;
  }
  
  StaticJsonDocument<256> doc;
  doc["type"] = "obstacle";
  // distance_cm: khoảng cách đến vật cản (cm)
  doc["distance_cm"] = distance_cm;
  doc["timestamp"] = millis();
  
  char buffer[256];
  serializeJson(doc, buffer);
  
  mqttClient.publish(topic_event.c_str(), buffer);
  
  Serial.print("Obstacle event published: ");
  Serial.print(distance_cm);
  Serial.println(" cm");
}

// ================= Check Connection =================
bool mqtt_isConnected() {
  return mqttClient.connected();
}

#pragma GCC diagnostic pop

