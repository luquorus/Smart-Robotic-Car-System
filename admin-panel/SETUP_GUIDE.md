# Hướng dẫn Setup và Kết nối Device

## Cách Device xuất hiện trong Admin Panel

Device sẽ tự động xuất hiện trong Admin Panel khi ESP32 publish MQTT messages với các topics sau:

### 1. Status Message (Bắt buộc để hiển thị status)
**Topic:** `car/{device_id}/status`

**Payload:**
```json
{
  "device_id": "esp32_car_7E7C3C",
  "status": "online",
  "timestamp_ms": 1234567
}
```

### 2. Telemetry Message
**Topic:** `car/{device_id}/telemetry`

**Payload:**
```json
{
  "device_id": "esp32_car_7E7C3C",
  "mode": "manual",
  "motion": "fwd",
  "speed": {"linear": 120, "rot": 80},
  "distance_cm": 23.4,
  "obstacle": false,
  "line": {"left": 0, "center": 1, "right": 0},
  "wifi_rssi": -55,
  "uptime_ms": 1234567
}
```

### 3. Event Message
**Topic:** `car/{device_id}/event`

**Payload:**
```json
{
  "device_id": "esp32_car_7E7C3C",
  "event": "obstacle",
  "distance_cm": 18.2,
  "timestamp_ms": 1234567
}
```

## Test với Script MQTT

Backend có script test để publish messages giả lập:

```bash
cd backend
npm run test-mqtt
```

Script này sẽ:
- Publish 1 status message
- Publish 1 telemetry message  
- Publish 1 event message
- Tiếp tục publish telemetry mỗi 2 giây trong 30 giây

Sau khi chạy script, mở Admin Panel và bạn sẽ thấy device `esp32_car_7E7C3C` xuất hiện.

## Code ESP32 mẫu (Arduino)

```cpp
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* mqtt_server = "192.168.0.107";
const int mqtt_port = 1883;

const char* device_id = "esp32_car_7E7C3C";

WiFiClient espClient;
PubSubClient client(espClient);

void setup() {
  Serial.begin(115200);
  
  // Connect WiFi
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("WiFi connected");
  
  // Connect MQTT
  client.setServer(mqtt_server, mqtt_port);
  while (!client.connected()) {
    if (client.connect(device_id)) {
      Serial.println("MQTT connected");
    } else {
      delay(5000);
    }
  }
  
  // Publish initial status
  publishStatus("online");
}

void loop() {
  client.loop();
  
  // Publish status every 30 seconds
  static unsigned long lastStatus = 0;
  if (millis() - lastStatus > 30000) {
    publishStatus("online");
    lastStatus = millis();
  }
  
  // Publish telemetry every 1 second
  static unsigned long lastTelemetry = 0;
  if (millis() - lastTelemetry > 1000) {
    publishTelemetry();
    lastTelemetry = millis();
  }
}

void publishStatus(const char* status) {
  StaticJsonDocument<200> doc;
  doc["device_id"] = device_id;
  doc["status"] = status;
  doc["timestamp_ms"] = millis();
  
  char payload[200];
  serializeJson(doc, payload);
  
  String topic = "car/" + String(device_id) + "/status";
  client.publish(topic.c_str(), payload);
  Serial.println("Published status: " + String(status));
}

void publishTelemetry() {
  StaticJsonDocument<500> doc;
  doc["device_id"] = device_id;
  doc["mode"] = "manual";
  doc["motion"] = "stop";
  doc["speed"]["linear"] = 120;
  doc["speed"]["rot"] = 80;
  doc["distance_cm"] = 25.5;
  doc["obstacle"] = false;
  doc["line"]["left"] = 0;
  doc["line"]["center"] = 1;
  doc["line"]["right"] = 0;
  doc["wifi_rssi"] = WiFi.RSSI();
  doc["uptime_ms"] = millis();
  
  char payload[500];
  serializeJson(doc, payload);
  
  String topic = "car/" + String(device_id) + "/telemetry";
  client.publish(topic.c_str(), payload);
  Serial.println("Published telemetry");
}

void publishEvent(const char* event, float distance) {
  StaticJsonDocument<200> doc;
  doc["device_id"] = device_id;
  doc["event"] = event;
  doc["distance_cm"] = distance;
  doc["timestamp_ms"] = millis();
  
  char payload[200];
  serializeJson(doc, payload);
  
  String topic = "car/" + String(device_id) + "/event";
  client.publish(topic.c_str(), payload);
  Serial.println("Published event: " + String(event));
}
```

## Kiểm tra kết nối

1. **Kiểm tra Backend:**
   - Chạy `npm run dev` trong thư mục `backend`
   - Xem console log: `[MQTT] Connected` và `[MQTT] Subscribed to car/+/...`

2. **Kiểm tra Frontend:**
   - Chạy `npm run dev` trong thư mục `admin-ui`
   - Mở browser tại `http://localhost:5173`
   - Xem console (F12): `[Socket.IO] Connected`

3. **Test với script:**
   ```bash
   cd backend
   npm run test-mqtt
   ```
   - Device sẽ xuất hiện trong Admin Panel sau vài giây

## Troubleshooting

**Device không xuất hiện:**
- Kiểm tra MQTT broker đang chạy
- Kiểm tra MQTT_URL trong `.env` đúng chưa
- Kiểm tra ESP32 đã publish đúng topic format: `car/{device_id}/status`
- Kiểm tra MongoDB connection (xem console log backend)

**Socket.IO không kết nối:**
- Kiểm tra backend đang chạy tại `http://localhost:8080`
- Kiểm tra `VITE_API` trong `admin-ui/.env`
- Xem console browser để biết lỗi

**Không có dữ liệu realtime:**
- Kiểm tra Socket.IO connection (console browser)
- Kiểm tra backend có nhận MQTT messages không (console backend)
- Kiểm tra MongoDB có insert documents không

