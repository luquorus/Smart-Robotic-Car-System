# ESP32 Car Admin Panel

Web Admin Panel cho xe ESP32 với backend Node.js và frontend React.

## Cấu trúc Project

```
admin-panel/
├── backend/          # Node.js Backend
│   ├── src/
│   │   ├── index.js    # Express server + Socket.IO + MQTT
│   │   ├── mongo.js    # MongoDB connection
│   │   ├── mqtt.js     # MQTT client
│   │   ├── routes.js   # REST API routes
│   │   ├── indexes.js  # MongoDB indexes
│   │   └── utils.js    # Helper functions
│   ├── package.json
│   └── .env.example
└── admin-ui/        # React Frontend
    ├── src/
    │   ├── App.jsx
    │   └── App.css
    ├── package.json
    └── .env
```

## Cài đặt và Chạy

### Backend

1. Vào thư mục backend:
```bash
cd backend
```

2. Cài đặt dependencies:
```bash
npm install
```

3. Tạo file `.env` với cấu hình sau:
```bash
PORT=8080
MQTT_URL=mqtt://YOUR_MQTT_BROKER_IP:1883
MONGO_URI=your_mongodb_connection_string
MONGO_DB=esp32_car
```

**Lưu ý:** Thay thế `YOUR_MQTT_BROKER_IP` và `your_mongodb_connection_string` bằng thông tin thực tế của bạn.

4. Chạy backend:
```bash
npm run dev
```

Backend sẽ chạy tại `http://localhost:8080`

### Frontend

1. Vào thư mục admin-ui:
```bash
cd admin-ui
```

2. Cài đặt dependencies (nếu chưa có):
```bash
npm install
```

3. Tạo file `.env` (nếu chưa có):
```bash
VITE_API=http://localhost:8080
```

4. Chạy frontend:
```bash
npm run dev
```

Frontend sẽ chạy tại `http://localhost:5173`

## MQTT Topics

Backend subscribe các topics:
- `car/+/telemetry` - Dữ liệu telemetry từ ESP32
- `car/+/event` - Events từ ESP32
- `car/+/status` - Status updates từ ESP32

## API Endpoints

- `GET /api/health` - Health check
- `GET /api/devices` - Danh sách devices
- `GET /api/telemetry/latest?device_id=...` - Telemetry mới nhất
- `GET /api/telemetry?device_id=...&limit=...&from=...&to=...` - Lịch sử telemetry
- `GET /api/events?device_id=...&limit=...&from=...&to=...` - Lịch sử events
- `GET /api/status?device_id=...&limit=...&from=...&to=...` - Lịch sử status

## Socket.IO Events

Server emit:
- `telemetry` - Telemetry mới
- `event` - Event mới
- `status` - Status update mới

## MongoDB Collections

- `telemetry` - Dữ liệu telemetry
- `events` - Events
- `status` - Status updates

Indexes tự động tạo:
- `{ device_id: 1, ts: -1 }` cho mỗi collection

