# 🚗 Smart Robotic Car System

This project is a Capstone Project for the course IoT Application at Hanoi University of Science and Technology (HUST).

The system allows:

* Real-time **remote control of an ESP32-based car**
* **Live camera streaming** from ESP32-CAM
* **Admin dashboard** for monitoring and management
* **User controller UI** (web / mobile wrapper)

---

## 📁 Project Structure

```
.
├── admin-panel/        # Admin web dashboard
├── esp32_car/          # ESP32 car firmware (motor control, Wi-Fi, MQTT, HTTP)
├── esp32-cam/          # ESP32-CAM firmware (camera streaming)
├── user-controller/    # User control UI (web or mobile wrapper)
└── README.md
```

---

## 🧠 System Overview

### Architecture

* **ESP32 Car**

  * Controls motors, speed, modes (manual / line-follow)
  * Exposes HTTP endpoints for control
  * Publishes telemetry via MQTT (optional)
* **ESP32-CAM**

  * Provides MJPEG live video stream
* **User Controller**

  * Web-based control UI (can be wrapped as a mobile app)
* **Admin Panel**

  * Web dashboard for monitoring, logging, and management

---

## ⚙️ Requirements

### Hardware

* ESP32 Dev Board (for car control)
* ESP32-CAM module
* Motor driver (L298N / TB6612 / similar)
* Power supply (battery)
* Wi-Fi router **or** ESP32 AP mode

### Software

* Node.js >= 18
* Arduino IDE **or** PlatformIO
* Git
* (Optional) MQTT Broker (Mosquitto)

---

## 🔧 Installation & Setup

---

## 1️⃣ ESP32 Car Firmware (`esp32_car/`)

### 1.1 Open the firmware

* Using **Arduino IDE** or **PlatformIO (VS Code)**

### 1.2 Configure Wi-Fi

Edit the Wi-Fi settings in the firmware:

```cpp
const char* ssid = "YOUR_WIFI_NAME";
const char* password = "YOUR_WIFI_PASSWORD";
```

Or enable **AP mode** if supported:

```text
SSID: ESP32-Car
IP:   192.168.4.1
```

### 1.3 Flash ESP32

* Select correct board and COM port
* Upload firmware

### 1.4 Test endpoints

Open browser:

```
http://192.168.4.1/
```

Control endpoints example:

```
/forward
/backward
/left
/right
/stop
/camera/stream
```

---

## 2️⃣ ESP32-CAM Firmware (`esp32-cam/`)

### 2.1 Open project

* Use Arduino IDE or PlatformIO

### 2.2 Select board

* **AI Thinker ESP32-CAM**

### 2.3 Configure Wi-Fi

```cpp
const char* ssid = "YOUR_WIFI_NAME";
const char* password = "YOUR_WIFI_PASSWORD";
```

### 2.4 Flash ESP32-CAM

* Use FTDI programmer
* GPIO0 → GND (flash mode)
* Upload firmware
* Reboot

### 2.5 Access camera stream

```
http://<ESP32-CAM-IP>/camera/stream
```

---

## 3️⃣ Admin Panel (`admin-panel/`)

### 3.1 Install dependencies

```bash
cd admin-panel
npm install
```

### 3.2 Configure environment

Create `.env` file:

```env
PORT=3000
MQTT_BROKER=localhost
MQTT_PORT=1883
MONGODB_URI=your_mongodb_connection_string
```

### 3.3 Run admin web

```bash
npm run dev
```

Open:

```
http://localhost:3000
```

---

## 4️⃣ User Controller (`user-controller/`)

This is the **user-facing control interface** (web or mobile wrapper).

### 4.1 Install dependencies

```bash
cd user-controller
npm install
```

### 4.2 Run web controller

```bash
npm run dev
```

### 4.3 Configure ESP32 IP

Update the base URL inside the project:

```js
const BASE_URL = "http://192.168.4.1";
```

### 4.4 (Optional) Build Mobile App

If using Expo:

```bash
npx expo start
```

Or build APK:

```bash
eas build -p android
```

---

## 📡 MQTT (Optional)

If enabled:

* ESP32 publishes telemetry:

```
car/<device_id>/telemetry
car/<device_id>/status
```

* Admin panel subscribes and stores data.

---

## 🔒 Modes

* **Manual Mode**

  * User controls car directly
* **Line Follow Mode**

  * Autonomous mode
  * Manual controls locked

---

## ✅ Features

* 🚗 Real-time car control
* 📷 Live MJPEG camera stream
* 📱 Mobile-friendly UI
* 🌐 Web-based admin dashboard
* 🔌 MQTT telemetry support
* 🔄 AP or STA Wi-Fi modes

---

## 🛠 Troubleshooting

* Ensure ESP32 and phone/PC are on the **same network**
* Disable firewall if MQTT not connecting
* Use short HTTP timeouts for better responsiveness
* Restart ESP32 if stream freezes

---

## 📜 License

MIT License
