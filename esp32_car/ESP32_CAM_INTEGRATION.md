# ESP32-CAM Integration Guide

## 📋 Tổng Quan

Hướng dẫn tích hợp ESP32-CAM để hiển thị video stream cho robot ESP32 Car.

---

## 🎯 Kiến Trúc Đề Xuất

### Option 1: ESP32-CAM Độc Lập (Khuyến Nghị)

**Cấu trúc:**
```
ESP32-CAM (riêng biệt)
  ├── Kết nối WiFi router (STA mode)
  ├── Stream video qua HTTP/MJPEG
  └── Có thể điều khiển qua HTTP API
```

**Ưu điểm:**
- ✅ Tách biệt phần xử lý (ESP32 Car) và phần video (ESP32-CAM)
- ✅ Không ảnh hưởng hiệu năng của ESP32 Car
- ✅ Dễ debug và maintain
- ✅ Có thể bật/tắt camera độc lập

**Nhược điểm:**
- ❌ Cần 2 ESP32 (tốn chi phí hơn)
- ❌ Cần quản lý 2 IP addresses

### Option 2: ESP32-CAM + ESP32 Car (I2C/Serial)

**Cấu trúc:**
```
ESP32-CAM (camera)
  ├── Kết nối với ESP32 Car qua I2C hoặc Serial
  ├── ESP32 Car điều khiển camera
  └── Video stream từ ESP32-CAM
```

**Ưu điểm:**
- ✅ Chỉ cần 1 WiFi connection
- ✅ ESP32 Car có thể điều khiển camera

**Nhược điểm:**
- ❌ Phức tạp hơn (cần giao tiếp giữa 2 board)
- ❌ Có thể ảnh hưởng hiệu năng

---

## 🚀 Implementation: Option 1 (Khuyến Nghị)

### 1. ESP32-CAM Firmware

**Chức năng:**
- Kết nối WiFi router (STA mode)
- Stream MJPEG qua HTTP
- Có thể điều khiển camera (resolution, quality, etc.)

**Code mẫu (ESP32-CAM):**
```cpp
#include "esp_camera.h"
#include <WiFi.h>
#include <WebServer.h>

// WiFi credentials
const char* ssid = "301";
const char* password = "20042023";

WebServer server(80);

// Camera pins (ESP32-CAM AI-Thinker)
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27
#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

void setup() {
  Serial.begin(115200);
  
  // Camera config
  camera_config_t config;
  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;
  config.pin_sscb_sda = SIOD_GPIO_NUM;
  config.pin_sscb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;
  
  // Quality settings
  if(psramFound()){
    config.frame_size = FRAMESIZE_VGA;  // 640x480
    config.jpeg_quality = 10;  // 0-63, lower = better
    config.fb_count = 2;
  } else {
    config.frame_size = FRAMESIZE_SVGA;  // 800x600
    config.jpeg_quality = 12;
    config.fb_count = 1;
  }
  
  // Init camera
  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("Camera init failed with error 0x%x", err);
    return;
  }
  
  // WiFi
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("");
  Serial.print("Camera IP: ");
  Serial.println(WiFi.localIP());
  
  // HTTP endpoints
  server.on("/stream", HTTP_GET, handleStream);
  server.on("/capture", HTTP_GET, handleCapture);
  server.on("/getIP", HTTP_GET, [](){
    server.send(200, "text/plain", WiFi.localIP().toString());
  });
  
  server.begin();
}

void handleStream() {
  WiFiClient client = server.client();
  String response = "HTTP/1.1 200 OK\r\n";
  response += "Content-Type: multipart/x-mixed-replace; boundary=frame\r\n\r\n";
  server.sendContent(response);
  
  while (client.connected()) {
    camera_fb_t * fb = esp_camera_fb_get();
    if (!fb) {
      Serial.println("Camera capture failed");
      break;
    }
    
    client.print("--frame\r\n");
    client.print("Content-Type: image/jpeg\r\n");
    client.print("Content-Length: " + String(fb->len) + "\r\n\r\n");
    client.write(fb->buf, fb->len);
    client.print("\r\n");
    
    esp_camera_fb_return(fb);
    delay(30);  // ~30 FPS
  }
}

void handleCapture() {
  camera_fb_t * fb = esp_camera_fb_get();
  if (!fb) {
    server.send(500, "text/plain", "Camera capture failed");
    return;
  }
  
  server.send_P(200, "image/jpeg", (const char *)fb->buf, fb->len);
  esp_camera_fb_return(fb);
}

void loop() {
  server.handleClient();
}
```

### 2. React Native App Integration

**Kết nối ESP32-CAM:**
```javascript
// Lấy IP của ESP32-CAM (có thể lưu trong AsyncStorage)
const CAMERA_IP = "192.168.1.100"; // hoặc lấy từ API

// Hiển thị video stream
import { WebView } from 'react-native-webview';

<WebView
  source={{ uri: `http://${CAMERA_IP}/stream` }}
  style={{ flex: 1 }}
/>
```

**Hoặc dùng thư viện chuyên dụng:**
```bash
npm install react-native-vision-camera
# hoặc
npm install react-native-image-picker
```

### 3. Backend Server Integration

**Lưu camera IP:**
```python
# Khi ESP32-CAM kết nối, lưu IP vào database
# Có thể dùng MQTT để ESP32-CAM tự động gửi IP

# MQTT topic: camera/{device_id}/status
{
  "device_id": "esp32_cam_001",
  "ip": "192.168.1.100",
  "status": "online"
}
```

**Proxy video stream (nếu cần):**
```python
from flask import Flask, Response
import requests

app = Flask(__name__)

@app.route('/camera/stream')
def camera_stream():
    camera_ip = get_camera_ip_from_db()  # Lấy từ database
    def generate():
        r = requests.get(f'http://{camera_ip}/stream', stream=True)
        for chunk in r.iter_content(chunk_size=1024):
            yield chunk
    return Response(generate(), mimetype='multipart/x-mixed-replace; boundary=frame')
```

---

## 🔧 Option 2: ESP32-CAM + ESP32 Car (I2C)

### Kiến Trúc

```
ESP32-CAM (Camera)
  └── I2C/Serial ──> ESP32 Car (Main Controller)
                      └── HTTP Server (bao gồm video stream)
```

**ESP32 Car cần thêm:**
- I2C hoặc Serial để giao tiếp với ESP32-CAM
- Proxy video stream từ ESP32-CAM
- API để điều khiển camera

**Code mẫu (ESP32 Car):**
```cpp
// Thêm vào main.cpp
#include <Wire.h>

// I2C address của ESP32-CAM
#define CAM_I2C_ADDR 0x30

// Proxy video stream từ ESP32-CAM
server.on("/camera/stream", HTTP_GET, [](AsyncWebServerRequest *r){
  // Forward request tới ESP32-CAM
  // Hoặc lấy frame từ ESP32-CAM qua I2C/Serial
});
```

**Nhược điểm:**
- Phức tạp hơn
- Cần xử lý video stream trên ESP32 Car (tốn tài nguyên)
- Có thể làm chậm điều khiển robot

---

## 📱 React Native App - Hiển Thị Video

### Cách 1: WebView (Đơn giản nhất)

```javascript
import { WebView } from 'react-native-webview';

function CameraView({ cameraIP }) {
  return (
    <WebView
      source={{ uri: `http://${cameraIP}/stream` }}
      style={{ flex: 1 }}
      javaScriptEnabled={true}
      domStorageEnabled={true}
    />
  );
}
```

### Cách 2: Custom MJPEG Player

```bash
npm install react-native-mjpeg
```

```javascript
import MjpegStream from 'react-native-mjpeg';

<MjpegStream
  source={{ uri: `http://${cameraIP}/stream` }}
  style={{ flex: 1 }}
/>
```

### Cách 3: Native Module (Hiệu năng tốt nhất)

Tạo native module để decode MJPEG stream trực tiếp.

---

## 🗄️ Database Schema cho Camera

```sql
CREATE TABLE cameras (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  device_id VARCHAR(50) UNIQUE,
  car_device_id VARCHAR(50),  -- Liên kết với ESP32 Car
  ip_address VARCHAR(15),
  status VARCHAR(20),  -- "online", "offline"
  resolution VARCHAR(20),  -- "VGA", "SVGA", etc.
  quality INT,  -- JPEG quality 0-63
  last_seen DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_car_device (car_device_id)
);
```

---

## 🔄 MQTT Topics cho Camera

### Camera Status
- **Topic:** `camera/{device_id}/status`
- **Message:**
```json
{
  "device_id": "esp32_cam_001",
  "ip": "192.168.1.100",
  "status": "online",
  "resolution": "VGA",
  "quality": 10
}
```

### Camera Control (nếu cần)
- **Topic:** `camera/{device_id}/control`
- **Message:**
```json
{
  "action": "set_resolution",
  "value": "VGA"
}
```

---

## 🎯 Khuyến Nghị

### Cho React Native App:
1. **Dùng Option 1** (ESP32-CAM độc lập)
2. **Lưu camera IP** trong AsyncStorage hoặc lấy từ backend
3. **Hiển thị video** bằng WebView hoặc MjpegStream component
4. **Kết nối ESP32 Car** qua STA mode (đã sửa trong code)

### Cho Backend Server:
1. **Lưu camera IP** vào database khi ESP32-CAM online
2. **Proxy video stream** nếu cần (qua firewall, etc.)
3. **Hiển thị trong admin panel** bằng HTML `<img>` tag với MJPEG stream

### Cho Admin Panel:
```html
<!-- Hiển thị video stream -->
<img src="http://192.168.1.100/stream" style="width: 100%; max-width: 640px;" />

<!-- Hoặc dùng iframe -->
<iframe src="http://192.168.1.100/stream" width="640" height="480"></iframe>
```

---

## 📝 Tóm Tắt

1. **ESP32-CAM chạy độc lập** (Option 1) - Khuyến nghị
2. **Cả 2 ESP32 kết nối WiFi router** (STA mode)
3. **React Native app** kết nối cả 2:
   - ESP32 Car: `http://esp32-car.local` hoặc IP
   - ESP32-CAM: `http://192.168.1.100/stream` hoặc IP
4. **Backend server** quản lý IP của cả 2 devices qua MQTT
5. **Admin panel** hiển thị video stream qua HTML

---

**Lưu ý:**
- ESP32-CAM cần PSRAM để stream tốt
- Chất lượng video phụ thuộc vào WiFi signal strength
- Có thể điều chỉnh resolution và quality để tối ưu bandwidth

