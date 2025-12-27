# ESP32 Car - Điều Khiển Xe Tự Động với MQTT

Xe tự động ESP32 với chức năng điều khiển qua web, line-following, tránh vật cản và gửi telemetry qua MQTT.

## 🚀 Tính Năng

- ✅ **Điều khiển qua Web**: Giao diện web đẹp, điều khiển real-time
- ✅ **Line Following**: Tự động đi theo vạch đen với PID control
- ✅ **Tránh Vật Cản**: HC-SR04 phát hiện và né vật cản tự động
- ✅ **MQTT Telemetry**: Gửi dữ liệu sensor và trạng thái qua MQTT
- ✅ **WiFi AP+STA**: Vừa tạo hotspot, vừa kết nối WiFi
- ✅ **Servo Gripper**: Điều khiển kẹp vật qua web

## 📁 Cấu Trúc Project

```
esp32_car/
├── src/
│   ├── main.cpp          # Code chính (web server, motor control)
│   ├── do_line.cpp       # Line-following logic
│   └── mqtt_client.cpp   # MQTT client
├── include/
│   ├── do_line.h
│   └── mqtt_client.h
├── platformio.ini        # PlatformIO config
├── HUONG_DAN.md          # Hướng dẫn chi tiết (Tiếng Việt)
└── test_mqtt.py          # Script test MQTT
```

## 🔧 Cài Đặt Nhanh

### 1. Mở Project trong VSCode

```bash
# Mở VSCode
code esp32_car
```

### 2. Cấu Hình MQTT (Tùy chọn)

Sửa file `src/mqtt_client.cpp`:
```cpp
const char* MQTT_BROKER = "192.168.1.100";  // IP broker của bạn
const int MQTT_PORT = 1883;
```

### 3. Compile và Upload

1. Nhấn **✓ Build** (hoặc Ctrl+Alt+B)
2. Nhấn **→ Upload** (hoặc Ctrl+Alt+U)
3. Mở **Serial Monitor** (Ctrl+Alt+S) - baud 115200

### 4. Kết Nối

1. Tìm WiFi: **"ESP32-Car"**
2. Mật khẩu: **"12345678"**
3. Mở browser: `http://192.168.4.1`

## 📡 MQTT Topics

- **Telemetry**: `car/{device_id}/telemetry` (mỗi 400ms)
- **Events**: `car/{device_id}/event` (khi có sự kiện)
- **Status**: `car/{device_id}/status` (khi online/offline)

## 🧪 Test MQTT

### Cách 1: Dùng Python Script

```bash
# Cài đặt
pip install paho-mqtt

# Chạy
python test_mqtt.py
```

### Cách 2: Dùng Mosquitto

```bash
# Subscribe telemetry
mosquitto_sub -h 192.168.1.100 -t "car/+/telemetry" -v
```

## 📖 Hướng Dẫn Chi Tiết

Xem file **[HUONG_DAN.md](HUONG_DAN.md)** để biết:
- Cách compile và upload từ VSCode
- Test từng chức năng
- Xử lý lỗi
- Cấu hình chi tiết

## 🔌 Sơ Đồ Chân

- **Motors**: IN1=12, IN2=14, ENA=13 (Right) | IN3=4, IN4=2, ENB=15 (Left)
- **Line Sensors**: L2=34, L1=32, M=33, R1=25, R2=27
- **Encoders**: ENC_L=26, ENC_R=22
- **Ultrasonic**: TRIG=21, ECHO=19
- **Servo**: Pin 18

## 📦 Dependencies

- ESPAsyncWebServer
- ESP32Servo
- PubSubClient
- ArduinoJson

(Tất cả tự động cài qua PlatformIO)

## 🐛 Xử Lý Lỗi

Xem phần **"Xử Lý Lỗi"** trong [HUONG_DAN.md](HUONG_DAN.md)

## 📝 License

MIT License - Tự do sử dụng và chỉnh sửa

---

**Chúc bạn build thành công! 🚗✨**

