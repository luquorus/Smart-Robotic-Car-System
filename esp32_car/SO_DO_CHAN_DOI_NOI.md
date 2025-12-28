# Sơ Đồ Chân Đấu Nối Phần Cứng - ESP32 Car

## Bảng Tổng Hợp Chân GPIO

| Chức Năng | Chân ESP32 | Mô Tả | Ghi Chú |
|-----------|------------|-------|---------|
| **ĐỘNG CƠ BÁNH TRÁI** |
| IN1 | GPIO 12 | Điều khiển chiều quay (HIGH/LOW) | Kết nối L298N IN1 |
| IN2 | GPIO 14 | Điều khiển chiều quay (HIGH/LOW) | Kết nối L298N IN2 |
| ENA | GPIO 13 | PWM điều khiển tốc độ (0-255) | Kết nối L298N ENA |
| **ĐỘNG CƠ BÁNH PHẢI** |
| IN3 | GPIO 4 | Điều khiển chiều quay (HIGH/LOW) | Kết nối L298N IN3 |
| IN4 | GPIO 2 | Điều khiển chiều quay (HIGH/LOW) | Kết nối L298N IN4 |
| ENB | GPIO 15 | PWM điều khiển tốc độ (0-255) | Kết nối L298N ENB |
| **CẢM BIẾN LINE (TCRT5000)** |
| L2 (Outer-Left) | GPIO 34 | Cảm biến ngoài cùng bên trái | INPUT, LOW khi trên vạch đen |
| L1 (Left) | GPIO 32 | Cảm biến bên trái | INPUT, LOW khi trên vạch đen |
| M (Middle) | GPIO 33 | Cảm biến giữa | INPUT, LOW khi trên vạch đen |
| R1 (Right) | GPIO 25 | Cảm biến bên phải | INPUT, LOW khi trên vạch đen |
| R2 (Outer-Right) | GPIO 27 | Cảm biến ngoài cùng bên phải | INPUT, LOW khi trên vạch đen |
| **ENCODER** |
| ENC_L | GPIO 26 | Encoder bánh trái | INPUT_PULLUP, ISR CHANGE |
| ENC_R | GPIO 22 | Encoder bánh phải | INPUT_PULLUP, ISR CHANGE |
| **CẢM BIẾN SIÊU ÂM (HC-SR04)** |
| TRIG | GPIO 21 | Chân Trigger | OUTPUT, phát xung 10µs |
| ECHO | GPIO 19 | Chân Echo | INPUT, đọc thời gian phản hồi |
| **SERVO (Tùy chọn)** |
| Servo | GPIO 18 | Điều khiển servo gripper | OUTPUT, PWM (nếu sử dụng) |

## Sơ Đồ Đấu Nối L298N

### Kết Nối L298N với ESP32

| L298N | ESP32 | Chức Năng |
|-------|-------|-----------|
| IN1 | GPIO 12 | Điều khiển bánh trái - chiều 1 |
| IN2 | GPIO 14 | Điều khiển bánh trái - chiều 2 |
| ENA | GPIO 13 | PWM bánh trái (0-255) |
| IN3 | GPIO 4 | Điều khiển bánh phải - chiều 1 |
| IN4 | GPIO 2 | Điều khiển bánh phải - chiều 2 |
| ENB | GPIO 15 | PWM bánh phải (0-255) |
| VCC | 5V | Nguồn logic (có thể dùng 3.3V) |
| GND | GND | Mass chung |
| +12V | Pin nguồn động cơ | Nguồn động cơ (7-12V) |
| GND | GND | Mass nguồn động cơ |

### Kết Nối Động Cơ với L298N

| L298N | Động Cơ |
|-------|---------|
| OUT1, OUT2 | Động cơ bánh trái |
| OUT3, OUT4 | Động cơ bánh phải |

## Sơ Đồ Đấu Nối Cảm Biến

### Cảm Biến Line (TCRT5000) - 5 Cảm Biến

| Cảm Biến | ESP32 | VCC | GND | Chức Năng |
|----------|-------|-----|-----|-----------|
| L2 | GPIO 34 | 3.3V | GND | Phát hiện vạch ngoài trái |
| L1 | GPIO 32 | 3.3V | GND | Phát hiện vạch trái |
| M | GPIO 33 | 3.3V | GND | Phát hiện vạch giữa |
| R1 | GPIO 25 | 3.3V | GND | Phát hiện vạch phải |
| R2 | GPIO 27 | 3.3V | GND | Phát hiện vạch ngoài phải |

**Lưu ý:** TCRT5000 trả về LOW khi phát hiện vạch đen.

### Encoder (Optical Encoder)

| Encoder | ESP32 | VCC | GND | Chức Năng |
|---------|-------|-----|-----|-----------|
| ENC_L (A) | GPIO 26 | 3.3V hoặc 5V | GND | Đếm xung bánh trái |
| ENC_R (A) | GPIO 22 | 3.3V hoặc 5V | GND | Đếm xung bánh phải |

**Lưu ý:** 
- Sử dụng INPUT_PULLUP (không cần điện trở kéo lên ngoài)
- ISR trên cả 2 cạnh (CHANGE) → đếm 2x số xung
- PULSES_PER_REV = 20 (sau khi nhân 2 = 40 xung/vòng)

### Cảm Biến Siêu Âm HC-SR04

| HC-SR04 | ESP32 | Chức Năng |
|---------|-------|-----------|
| VCC | 5V | Nguồn (có thể dùng 3.3V nhưng khoảng cách giảm) |
| GND | GND | Mass |
| TRIG | GPIO 21 | Kích hoạt đo (OUTPUT) |
| ECHO | GPIO 19 | Nhận tín hiệu phản hồi (INPUT) |

**Lưu ý:** 
- ECHO có thể cần voltage divider (5V → 3.3V) nếu HC-SR04 dùng 5V
- Hoặc dùng HC-SR04 phiên bản 3.3V

## Sơ Đồ Nguồn

| Nguồn | Điện Áp | Dòng | Kết Nối |
|-------|---------|------|---------|
| ESP32 | 5V (USB) hoặc 3.3V | ~500mA | Nguồn chính |
| L298N Logic | 5V hoặc 3.3V | ~50mA | Từ ESP32 hoặc nguồn riêng |
| L298N Motor | 7-12V | 1-2A | Pin LiPo hoặc adapter |
| Cảm Biến | 3.3V hoặc 5V | ~50mA | Từ ESP32 |
| HC-SR04 | 5V (khuyến nghị) | ~15mA | Từ nguồn 5V |

## Bảng Tóm Tắt Theo Nhóm

### Nhóm Điều Khiển Động Cơ
| Chân | Chức Năng | Loại | Mô Tả |
|------|-----------|------|-------|
| GPIO 12 | IN1 (Trái) | OUTPUT | Chiều quay bánh trái |
| GPIO 14 | IN2 (Trái) | OUTPUT | Chiều quay bánh trái |
| GPIO 13 | ENA (Trái) | PWM | Tốc độ bánh trái (0-255) |
| GPIO 4 | IN3 (Phải) | OUTPUT | Chiều quay bánh phải |
| GPIO 2 | IN4 (Phải) | OUTPUT | Chiều quay bánh phải |
| GPIO 15 | ENB (Phải) | PWM | Tốc độ bánh phải (0-255) |

### Nhóm Cảm Biến Line
| Chân | Chức Năng | Loại | Mô Tả |
|------|-----------|------|-------|
| GPIO 34 | L2 (Outer-Left) | INPUT | Cảm biến ngoài trái |
| GPIO 32 | L1 (Left) | INPUT | Cảm biến trái |
| GPIO 33 | M (Middle) | INPUT | Cảm biến giữa |
| GPIO 25 | R1 (Right) | INPUT | Cảm biến phải |
| GPIO 27 | R2 (Outer-Right) | INPUT | Cảm biến ngoài phải |

### Nhóm Encoder
| Chân | Chức Năng | Loại | Mô Tả |
|------|-----------|------|-------|
| GPIO 26 | ENC_L | INPUT_PULLUP | Encoder bánh trái (ISR) |
| GPIO 22 | ENC_R | INPUT_PULLUP | Encoder bánh phải (ISR) |

### Nhóm Cảm Biến Siêu Âm
| Chân | Chức Năng | Loại | Mô Tả |
|------|-----------|------|-------|
| GPIO 21 | TRIG | OUTPUT | Kích hoạt đo khoảng cách |
| GPIO 19 | ECHO | INPUT | Nhận tín hiệu phản hồi |

## Lưu Ý Quan Trọng

1. **GPIO 34, 35, 36, 39**: Chỉ có thể đọc (INPUT only), không hỗ trợ PULLUP/PULLDOWN
2. **GPIO 2**: Có thể gây vấn đề khi boot nếu kết nối sai (có LED onboard)
3. **PWM**: ESP32 hỗ trợ PWM trên hầu hết các chân, tần số có thể điều chỉnh
4. **ISR**: Encoder sử dụng interrupt trên cả 2 cạnh (CHANGE) để đếm chính xác
5. **Nguồn**: Đảm bảo nguồn đủ mạnh cho động cơ (khuyến nghị 7.4V LiPo)

## Sơ Đồ Kết Nối Tổng Thể

```
ESP32 DevKit
│
├── L298N Motor Driver
│   ├── IN1, IN2, ENA → Bánh trái
│   └── IN3, IN4, ENB → Bánh phải
│
├── 5x TCRT5000 Line Sensors
│   ├── L2 → GPIO 34
│   ├── L1 → GPIO 32
│   ├── M  → GPIO 33
│   ├── R1 → GPIO 25
│   └── R2 → GPIO 27
│
├── 2x Optical Encoders
│   ├── ENC_L → GPIO 26
│   └── ENC_R → GPIO 22
│
└── HC-SR04 Ultrasonic
    ├── TRIG → GPIO 21
    └── ECHO → GPIO 19
```

## Thông Số Kỹ Thuật

| Thông Số | Giá Trị |
|----------|---------|
| Bán kính bánh xe | 0.0325 m (32.5 mm) |
| Khoảng cách 2 bánh (Track Width) | 0.095 m (95 mm) |
| Xung/vòng encoder | 20 (hiệu quả 40 với CHANGE) |
| Ngưỡng vật cản | 15 cm |
| Tốc độ cơ sở line-follow | 0.5 m/s |
| Chu kỳ PID | 10 ms |
| Tốc độ PWM tối đa | 255 |
| Tốc độ PWM tối thiểu | 60-90 (deadband) |

