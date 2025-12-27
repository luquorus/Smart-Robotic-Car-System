#pragma once
#include <Arduino.h>

// ================= MQTT Client API =================
// Non-blocking MQTT client for ESP32 car telemetry and events

// Initialize MQTT client (call once in setup)
void mqtt_init();

// MQTT loop (call in main loop, non-blocking)
void mqtt_loop();

// Publish telemetry data (JSON format)
// Extended version with state parameters from main.cpp
void mqtt_publishTelemetryWithState(const char* mode, const char* motion, 
                                     int speed_linear, int speed_rot);

// Publish obstacle event (when obstacle state changes)
void mqtt_publishObstacleEvent(float distance_cm);

// Check if MQTT is connected
bool mqtt_isConnected();

