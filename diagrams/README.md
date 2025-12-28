# PlantUML Sequence Diagrams

Bộ sơ đồ sequence diagram mô tả các luồng chính trong hệ thống IoT Car Control.

## 📋 Danh Sách Diagrams

### Nhóm CORE (Bắt buộc)

1. **01_manual_control.puml** - Manual Control Flow
   - Mobile App → ESP32 Robot (HTTP)
   - Điều khiển trực tiếp robot qua HTTP endpoints
   - Không qua backend proxy

2. **02_telemetry_realtime.puml** - Telemetry Realtime Flow
   - Robot → MQTT → Backend → WebSocket → Web UI
   - Luồng publish → store → push realtime
   - "Linh hồn IoT" của hệ thống

3. **03_live_video_streaming.puml** - Live Video Streaming
   - ESP32-CAM → Mobile App
   - MJPEG stream trực tiếp
   - Tách biệt với MQTT/REST

### Nhóm ADMIN / DATA (Chọn 1-2)

4. **04_telemetry_history.puml** - View Telemetry History & Charts
   - Web UI → Backend → MongoDB
   - Truy vấn lịch sử và hiển thị charts

5. **05_export_logs.puml** - Export Logs
   - Web UI → Backend → MongoDB → File Export
   - Xuất logs ra CSV/TXT

## 🚀 Cách Sử Dụng

### Xem Diagrams Online

1. Truy cập: https://www.plantuml.com/plantuml/uml/
2. Copy nội dung file `.puml` vào editor
3. Xem diagram được render tự động

### Xem Diagrams Local

#### Cài đặt PlantUML

**Windows:**
```bash
# Cài Java trước
# Download PlantUML JAR từ: http://plantuml.com/download
java -jar plantuml.jar diagrams/*.puml
```

**VS Code:**
- Cài extension "PlantUML"
- Mở file `.puml` và nhấn `Alt+D` để preview

**Online:**
- Upload file lên: http://www.plantuml.com/plantuml/uml/

### Export sang PNG/SVG

```bash
# Sử dụng PlantUML JAR
java -jar plantuml.jar -tpng diagrams/*.puml
java -jar plantuml.jar -tsvg diagrams/*.puml
```

## 📝 Mô Tả Chi Tiết

### 1. Manual Control
- **Luồng:** Mobile App gửi HTTP GET request trực tiếp tới ESP32 Robot
- **Endpoints:** `/forward`, `/backward`, `/left`, `/right`, `/stop`, `/speed/lin/up`, etc.
- **Đặc điểm:** Không qua backend, kết nối trực tiếp

### 2. Telemetry Realtime
- **Luồng:** Robot publish MQTT → Backend subscribe → Store MongoDB → Push WebSocket → Web UI nhận realtime
- **Tần suất:** Mỗi 2 giây (TELEMETRY_INTERVAL_MS)
- **Topics:** `car/{device_id}/telemetry`, `car/{device_id}/event`, `car/{device_id}/status`

### 3. Live Video Streaming
- **Luồng:** ESP32-CAM stream MJPEG qua HTTP → Mobile App nhận và hiển thị
- **Format:** multipart/x-mixed-replace với boundary "frame"
- **FPS:** ~30 FPS
- **Endpoint:** `http://{ESP32-CAM_IP}/stream`

### 4. Telemetry History
- **Luồng:** Web UI request → Backend query MongoDB → Trả về JSON → Web UI render charts
- **API:** `GET /api/telemetry?device_id=...&limit=...&from=...&to=...`
- **Charts:** Time series, speed, distance, line sensors

### 5. Export Logs
- **Luồng:** Web UI request → Backend query MongoDB → Generate CSV/TXT → Download file
- **API:** `GET /api/devices/{device_id}/logs/export?type=...&format=...&from=...&to=...`
- **Formats:** CSV (Excel-compatible), TXT (human-readable)

## 🔧 Customization

Để chỉnh sửa diagrams:

1. Mở file `.puml` trong text editor
2. Chỉnh sửa theo cú pháp PlantUML
3. Xem preview để kiểm tra
4. Export sang PNG/SVG nếu cần

## 📚 Tài Liệu Tham Khảo

- PlantUML Syntax: http://plantuml.com/sequence-diagram
- PlantUML Examples: http://plantuml.com/guide
- Online Editor: http://www.plantuml.com/plantuml/uml/

