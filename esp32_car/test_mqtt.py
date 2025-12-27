#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script test MQTT cho ESP32 Car
Cài đặt: pip install paho-mqtt
Chạy: python test_mqtt.py
"""

import paho.mqtt.client as mqtt
import json
import sys
from datetime import datetime

# ================= Cấu Hình =================
MQTT_BROKER = "192.168.1.107"  # Đổi thành IP broker của bạn
MQTT_PORT = 1883
# Dùng wildcard để subscribe tất cả devices, hoặc điền device ID cụ thể
# Ví dụ: "esp32_car_A1B2C3" hoặc "esp32_car_*" (wildcard)
DEVICE_ID_PATTERN = "esp32_car_*"  # Hoặc "esp32_car_+" hoặc device ID cụ thể

# ================= Callbacks =================
def on_connect(client, userdata, flags, rc):
    """Khi kết nối thành công"""
    if rc == 0:
        print("✅ Đã kết nối MQTT broker thành công!")
        print(f"📡 Đang lắng nghe topics:")
        
        # Subscribe với pattern
        if "*" in DEVICE_ID_PATTERN:
            # Wildcard: subscribe tất cả devices
            telemetry_topic = "car/+/telemetry"
            event_topic = "car/+/event"
            status_topic = "car/+/status"
            print(f"   - {telemetry_topic} (tất cả devices)")
            print(f"   - {event_topic} (tất cả devices)")
            print(f"   - {status_topic} (tất cả devices)")
        else:
            # Device ID cụ thể
            telemetry_topic = f"car/{DEVICE_ID_PATTERN}/telemetry"
            event_topic = f"car/{DEVICE_ID_PATTERN}/event"
            status_topic = f"car/{DEVICE_ID_PATTERN}/status"
            print(f"   - {telemetry_topic}")
            print(f"   - {event_topic}")
            print(f"   - {status_topic}")
        
        print("-" * 60)
        print("💡 Lưu ý: Nếu không nhận được data, kiểm tra:")
        print("   1. Device ID trong Serial Monitor của ESP32")
        print("   2. ESP32 đã kết nối MQTT chưa (xem Serial Monitor)")
        print("   3. Broker IP đúng chưa")
        print("-" * 60)
        
        # Subscribe topics
        client.subscribe(telemetry_topic)
        client.subscribe(event_topic)
        client.subscribe(status_topic)
    else:
        print(f"❌ Kết nối thất bại! Mã lỗi: {rc}")
        sys.exit(1)

def on_message(client, userdata, msg):
    """Khi nhận được message"""
    topic = msg.topic
    try:
        payload = json.loads(msg.payload.decode('utf-8'))
        timestamp = datetime.now().strftime("%H:%M:%S")
        
        print(f"\n[{timestamp}] 📨 Topic: {topic}")
        print("-" * 60)
        
        # Telemetry
        if "telemetry" in topic:
            print(f"🚗 Device ID: {payload.get('device_id', 'N/A')}")
            print(f"📊 Mode: {payload.get('mode', 'N/A')}")
            print(f"🎮 Motion: {payload.get('motion', 'N/A')}")
            print(f"⚡ Speed Linear: {payload.get('speed_linear', 0)}")
            print(f"🔄 Speed Rot: {payload.get('speed_rot', 0)}")
            print(f"📏 Distance: {payload.get('distance_cm', -1):.1f} cm")
            print(f"⚠️  Obstacle: {'CÓ' if payload.get('obstacle', False) else 'KHÔNG'}")
            
            line = payload.get('line', [])
            if line:
                print(f"📶 Line Sensors: L2={line[0]} L1={line[1]} M={line[2]} R1={line[3]} R2={line[4]}")
            
            print(f"📶 WiFi RSSI: {payload.get('wifi_rssi', 0)} dBm")
            print(f"⏱️  Uptime: {payload.get('uptime_ms', 0) / 1000:.1f} s")
        
        # Event
        elif "event" in topic:
            event_type = payload.get('type', 'unknown')
            print(f"🔔 Event Type: {event_type}")
            if event_type == "obstacle":
                print(f"⚠️  Vật cản phát hiện!")
                print(f"📏 Khoảng cách: {payload.get('distance_cm', 0):.1f} cm")
                print(f"⏰ Timestamp: {payload.get('timestamp', 0)} ms")
        
        # Status
        elif "status" in topic:
            print(f"📡 Status: {payload.get('status', 'N/A')}")
            print(f"🚗 Device ID: {payload.get('device_id', 'N/A')}")
            print(f"⏰ Timestamp: {payload.get('timestamp', 0)} ms")
        
        print("-" * 60)
        
    except json.JSONDecodeError:
        print(f"❌ Lỗi parse JSON: {msg.payload.decode('utf-8')}")
    except Exception as e:
        print(f"❌ Lỗi: {e}")

def on_disconnect(client, userdata, rc):
    """Khi mất kết nối"""
    print("\n⚠️  Mất kết nối MQTT broker!")
    if rc != 0:
        print(f"   Mã lỗi: {rc}")

# ================= Main =================
def main():
    print("=" * 60)
    print("🚗 ESP32 Car - MQTT Test Client")
    print("=" * 60)
    print(f"📡 Broker: {MQTT_BROKER}:{MQTT_PORT}")
    print(f"🔍 Device ID pattern: {DEVICE_ID_PATTERN}")
    print("=" * 60)
    print("\n⏳ Đang kết nối...")
    
    # Tạo MQTT client
    client = mqtt.Client()
    client.on_connect = on_connect
    client.on_message = on_message
    client.on_disconnect = on_disconnect
    
    try:
        # Kết nối
        client.connect(MQTT_BROKER, MQTT_PORT, 60)
        
        # Chạy loop (blocking)
        print("✅ Đã khởi động! Nhấn Ctrl+C để thoát.\n")
        client.loop_forever()
        
    except KeyboardInterrupt:
        print("\n\n👋 Đang ngắt kết nối...")
        client.disconnect()
        print("✅ Đã thoát!")
    except Exception as e:
        print(f"\n❌ Lỗi: {e}")
        print("\n💡 Kiểm tra:")
        print("   1. Broker đang chạy chưa?")
        print("   2. IP broker đúng chưa?")
        print("   3. Firewall có chặn port 1883 không?")
        sys.exit(1)

if __name__ == "__main__":
    main()

