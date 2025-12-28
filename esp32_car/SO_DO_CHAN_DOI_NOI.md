# Hardware Pin Connection Diagram - ESP32 Car

## GPIO Pin Summary Table

| Function | ESP32 Pin | Description |
|----------|-----------|-------------|
| **LEFT MOTOR** |
| IN1 | GPIO 12 | Direction control (HIGH/LOW) |
| IN2 | GPIO 14 | Direction control (HIGH/LOW) |
| ENA | GPIO 13 | PWM speed control (0-255) |
| **RIGHT MOTOR** |
| IN3 | GPIO 4 | Direction control (HIGH/LOW) |
| IN4 | GPIO 2 | Direction control (HIGH/LOW) |
| ENB | GPIO 15 | PWM speed control (0-255) |
| **LINE SENSORS (TCRT5000)** |
| L2 (Outer-Left) | GPIO 34 | Outer-left sensor |
| L1 (Left) | GPIO 32 | Left sensor |
| M (Middle) | GPIO 33 | Middle sensor |
| R1 (Right) | GPIO 25 | Right sensor |
| R2 (Outer-Right) | GPIO 27 | Outer-right sensor |
| **ENCODER** |
| ENC_L | GPIO 26 | Left wheel encoder |
| ENC_R | GPIO 22 | Right wheel encoder |
| **ULTRASONIC SENSOR (HC-SR04)** |
| TRIG | GPIO 21 | Trigger pin |
| ECHO | GPIO 19 | Echo pin |
| **SERVO (Optional)** |
| Servo | GPIO 18 | Servo gripper control |

## L298N Connection Diagram

### L298N to ESP32 Connection

| L298N | ESP32 | Function |
|-------|-------|----------|
| IN1 | GPIO 12 | Left motor direction 1 |
| IN2 | GPIO 14 | Left motor direction 2 |
| ENA | GPIO 13 | Left motor PWM (0-255) |
| IN3 | GPIO 4 | Right motor direction 1 |
| IN4 | GPIO 2 | Right motor direction 2 |
| ENB | GPIO 15 | Right motor PWM (0-255) |
| VCC | 5V | Logic power (can use 3.3V) |
| GND | GND | Common ground |
| +12V | Motor power pin | Motor power (7-12V) |
| GND | GND | Motor power ground |

### Motor to L298N Connection

| L298N | Motor |
|-------|-------|
| OUT1, OUT2 | Left motor |
| OUT3, OUT4 | Right motor |

## Sensor Connection Diagram

### Line Sensors (TCRT5000) - 5 Sensors

| Sensor | ESP32 | VCC | GND | Function |
|--------|-------|-----|-----|----------|
| L2 | GPIO 34 | 3.3V | GND | Detect outer-left line |
| L1 | GPIO 32 | 3.3V | GND | Detect left line |
| M | GPIO 33 | 3.3V | GND | Detect middle line |
| R1 | GPIO 25 | 3.3V | GND | Detect right line |
| R2 | GPIO 27 | 3.3V | GND | Detect outer-right line |

**Note:** TCRT5000 returns LOW when detecting black line.

### Encoder (Optical Encoder)

| Encoder | ESP32 | VCC | GND | Function |
|---------|-------|-----|-----|----------|
| ENC_L (A) | GPIO 26 | 3.3V or 5V | GND | Count left wheel pulses |
| ENC_R (A) | GPIO 22 | 3.3V or 5V | GND | Count right wheel pulses |

**Note:** 
- Uses INPUT_PULLUP (no external pull-up resistor needed)
- ISR on both edges (CHANGE) → counts 2x pulses
- PULSES_PER_REV = 20 (after multiply by 2 = 40 pulses/revolution)

### Ultrasonic Sensor HC-SR04

| HC-SR04 | ESP32 | Function |
|---------|-------|----------|
| VCC | 5V | Power (can use 3.3V but range reduced) |
| GND | GND | Ground |
| TRIG | GPIO 21 | Trigger measurement (OUTPUT) |
| ECHO | GPIO 19 | Receive echo signal (INPUT) |

**Note:** 
- ECHO may need voltage divider (5V → 3.3V) if HC-SR04 uses 5V
- Or use HC-SR04 3.3V version

## Power Supply Diagram

| Power Source | Voltage | Current | Connection |
|--------------|---------|---------|------------|
| ESP32 | 5V (USB) or 3.3V | ~500mA | Main power |
| L298N Logic | 5V or 3.3V | ~50mA | From ESP32 or separate source |
| L298N Motor | 7-12V | 1-2A | LiPo battery or adapter |
| Sensors | 3.3V or 5V | ~50mA | From ESP32 |
| HC-SR04 | 5V (recommended) | ~15mA | From 5V source |

## Summary Table by Group

### Motor Control Group
| Pin | Function | Type | Description |
|-----|----------|------|-------------|
| GPIO 12 | IN1 (Left) | OUTPUT | Left wheel direction |
| GPIO 14 | IN2 (Left) | OUTPUT | Left wheel direction |
| GPIO 13 | ENA (Left) | PWM | Left wheel speed (0-255) |
| GPIO 4 | IN3 (Right) | OUTPUT | Right wheel direction |
| GPIO 2 | IN4 (Right) | OUTPUT | Right wheel direction |
| GPIO 15 | ENB (Right) | PWM | Right wheel speed (0-255) |

### Line Sensor Group
| Pin | Function | Type | Description |
|-----|----------|------|-------------|
| GPIO 34 | L2 (Outer-Left) | INPUT | Outer-left sensor |
| GPIO 32 | L1 (Left) | INPUT | Left sensor |
| GPIO 33 | M (Middle) | INPUT | Middle sensor |
| GPIO 25 | R1 (Right) | INPUT | Right sensor |
| GPIO 27 | R2 (Outer-Right) | INPUT | Outer-right sensor |

### Encoder Group
| Pin | Function | Type | Description |
|-----|----------|------|-------------|
| GPIO 26 | ENC_L | INPUT_PULLUP | Left wheel encoder (ISR) |
| GPIO 22 | ENC_R | INPUT_PULLUP | Right wheel encoder (ISR) |

### Ultrasonic Sensor Group
| Pin | Function | Type | Description |
|-----|----------|------|-------------|
| GPIO 21 | TRIG | OUTPUT | Trigger distance measurement |
| GPIO 19 | ECHO | INPUT | Receive echo signal |

## Important Notes

1. **GPIO 34, 35, 36, 39**: Input only, no PULLUP/PULLDOWN support
2. **GPIO 2**: May cause boot issues if connected incorrectly (has onboard LED)
3. **PWM**: ESP32 supports PWM on most pins, frequency is adjustable
4. **ISR**: Encoder uses interrupt on both edges (CHANGE) for accurate counting
5. **Power**: Ensure sufficient power for motors (recommend 7.4V LiPo)

## Overall Connection Diagram

```
ESP32 DevKit
│
├── L298N Motor Driver
│   ├── IN1, IN2, ENA → Left wheel
│   └── IN3, IN4, ENB → Right wheel
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

## Technical Specifications

| Parameter | Value |
|-----------|-------|
| Wheel radius | 0.0325 m (32.5 mm) |
| Track width | 0.095 m (95 mm) |
| Encoder pulses/revolution | 20 (effective 40 with CHANGE) |
| Obstacle threshold | 15 cm |
| Base line-follow speed | 0.5 m/s |
| PID cycle | 10 ms |
| Maximum PWM speed | 255 |
| Minimum PWM speed | 60-90 (deadband) |
