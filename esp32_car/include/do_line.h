#pragma once
#include <Arduino.h>

// ================= ESP32 30P + L298N + analogWrite =================
// Mapping:
// - Right motor: IN1=12, IN2=14, ENA=13
// - Left motor: IN3=4, IN4=2, ENB=15
// - Line sensors: L2=34, L1=32, M=33, R1=25, R2=27
// - Encoders: ENC_L=26, ENC_R=22
// - HC-SR04: TRIG=21, ECHO=19
// ====================================================================

void do_line_setup();
void do_line_loop();
// yêu cầu dừng ngay mọi hành vi trong do_line (kể cả đang trong while)
void do_line_abort();
void motorsStop();

// Getter for ultrasonic distance (for MQTT telemetry)
float do_line_getDistanceCM();

// Update ultrasonic sensor (call frequently in manual mode)
void do_line_updateUltrasonic();

// Getter for line sensor states (for MQTT telemetry)
void do_line_getLineSensors(bool* L2, bool* L1, bool* M, bool* R1, bool* R2);

