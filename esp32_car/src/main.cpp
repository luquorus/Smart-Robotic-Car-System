#include <WiFi.h>
#include <ESPAsyncWebServer.h>
#include <ESPmDNS.h>
#include <HTTPClient.h>
#include "do_line.h"
#include "mqtt_client.h"

// ESP32-CAM IP address
const char* CAMERA_IP = "192.168.0.109";

// ================= WiFi Configuration =================
// Chọn chế độ WiFi: true = STA-only (chỉ kết nối router), false = AP+STA (cả hai)
const bool WIFI_STA_ONLY = true;  // Đổi thành false nếu muốn dùng AP+STA

// SoftAP for direct control (chỉ dùng khi WIFI_STA_ONLY = false)
const char* ap_ssid = "ESP32-Car";
const char* ap_password = "12345678";

// STA mode (connect to external WiFi) - CẤU HÌNH WiFi router của bạn
const char* sta_ssid = "301";  // Tên WiFi router
const char* sta_password = "20042023";  // Mật khẩu WiFi router

// ================= Motor pins =================
// Left motor
#define IN1 12
#define IN2 14
#define ENA 13
// Right motor
#define IN3 4
#define IN4 2
#define ENB 15

// ================= Speed =================
int speed_linear = 130;
int speed_rot = 110;
const int SPEED_MIN = 60;
const int SPEED_MAX = 255;
const int SPEED_STEP = 10;

// Hệ số bù lệch giữa 2 bánh
const float L_SCALE = 1.06f; // tăng nhẹ tốc độ target bánh trái (hoặc)
const float R_SCALE = 1.00f; // giữ nguyên bánh phải

// Giảm tốc bánh phía "bên trong cua" khi đi chéo (0–100%)
const int DIAG_SCALE = 70; // 70% -> cua mượt
static inline int diagScale(int v){
  return v * DIAG_SCALE / 100;
}

static inline int clamp(int v, int lo, int hi){
  return v<lo?lo:(v>hi?hi:v);
}

// ============ Đảo hướng steer tiến ============
const bool INVERT_STEER = true; // true: forward-left giảm bánh PHẢI

// ================= Server =================
AsyncWebServer server(80);

// ================= Mode =================
enum UIMode { MODE_MANUAL=0, MODE_LINE=1 };
volatile UIMode currentMode = MODE_MANUAL;
static bool lineInited = false; // để chỉ gọi do_line_setup() một lần
bool line_mode = false;

// ================= MQTT Obstacle Tracking =================
bool obstacle_prev_state = true;
const float OBSTACLE_TH_CM = 15.0f; // Same as do_line.cpp

// ================= UI =================
const char index_html[] PROGMEM = R"rawliteral(
<!DOCTYPE html><html lang="vi">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>ESP32 Car Control</title>
<style>
:root{--bg:#0f172a;--card:#111827;--muted:#94a3b8;--txt:#e5e7eb;--acc:#22c55e;--rot:#3b82f6;--stop:#ef4444;--amber:#f59e0b;}
*{box-sizing:border-box}
html,body{height:100%}
body{margin:0;font-family:ui-sans-serif,system-ui,Arial;background:radial-gradient(1200px 800px at 50% -10%, #1f2937 0%, var(--bg) 60%);
 color:var(--txt);display:flex;align-items:center;justify-content:center;padding:16px}
.card{width:min(520px,100%);background:linear-gradient(180deg,#0b1220 0%, var(--card) 100%);
 border:1px solid #1f2937;border-radius:16px;padding:18px 16px;box-shadow:0 10px 30px rgba(0,0,0,.35)}
h1{margin:0 0 2px;font-size:22px}
.muted{color:var(--muted);font-size:12px;margin-bottom:12px}
.row{display:flex;gap:10px;align-items:center;margin-bottom:10px}
select{background:#0b1220;color:var(--txt);border:1px solid #1f2937;border-radius:10px;padding:8px 10px;font-size:14px}
.badge{padding:6px 10px;border-radius:999px;border:1px solid #1f2937;background:#0b1220;font-size:12px}
.controls{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:8px}
.btn{
 appearance:none;border:0;border-radius:12px;padding:16px 8px;font-size:18px;font-weight:600;color:#0b1220;cursor:pointer;
 background:linear-gradient(180deg,#e5e7eb,#cbd5e1);box-shadow:0 4px 0 rgba(0,0,0,.25);transition:transform .05s,filter .15s,box-shadow .15s;width:100%;
 user-select:none;-webkit-user-select:none;touch-action:none;
}
.btn.acc{background:linear-gradient(180deg,#34d399,#22c55e)}
.btn.rot{background:linear-gradient(180deg,#93c5fd,#3b82f6)}
.btn.stop{background:linear-gradient(180deg,#fb7185,#ef4444);color:#fff}
.btn.active{transform:translateY(2px);box-shadow:0 2px 0 rgba(0,0,0,.25);filter:brightness(1.03)}
.footer{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}
.speed{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:12px;align-items:center}
.pill{grid-column:1/-1;text-align:center;background:#0b1220;border:1px solid #1f2937;border-radius:999px;padding:8px 10px;font-size:14px}
.overlay{position:fixed;inset:0;background:rgba(0,0,0,.35);display:none;align-items:center;justify-content:center;pointer-events:none;z-index:1000}
.overlay.show{display:flex}
.overlay .box{background:#0b1220;border:1px solid #1f2937;border-radius:12px;padding:12px 14px;color:var(--txt);font-size:14px}
*{margin:0;padding:0}
html,body{overflow:hidden}
body{display:flex;flex-direction:column;padding:8px;gap:8px;height:100%}
.container{display:flex;flex-direction:column;height:100%;gap:8px;max-width:1200px;margin:0 auto;width:100%}
.header{background:linear-gradient(180deg,#0b1220 0%, var(--card) 100%);border:1px solid #1f2937;border-radius:12px;padding:12px 16px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px}
.header h1{margin:0;font-size:20px}
.header-info{display:flex;gap:12px;align-items:center;flex-wrap:wrap}
.status-indicator{display:flex;align-items:center;gap:6px;font-size:12px}
.status-dot{width:8px;height:8px;border-radius:50%;background:#ef4444;animation:pulse 2s infinite}
.status-dot.connected{background:#22c55e}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
.camera-section{flex:1;min-height:0;background:#000;border:1px solid #1f2937;border-radius:12px;position:relative;overflow:hidden;display:flex;align-items:center;justify-content:center}
.camera-wrapper{width:100%;height:100%;position:relative}
#cameraStream{width:100%;height:100%;object-fit:contain;display:block}
.camera-loading{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#000;color:#fff;gap:12px;z-index:5}
.spinner{border:3px solid #1f2937;border-top-color:#22c55e;border-radius:50%;width:40px;height:40px;animation:spin 1s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.capture-btn{position:absolute;bottom:16px;right:16px;width:56px;height:56px;border-radius:50%;border:0;background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;font-size:24px;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,.4);transition:transform .2s,box-shadow .2s;z-index:10}
.capture-btn:hover{transform:scale(1.1);box-shadow:0 6px 16px rgba(0,0,0,.5)}
.capture-btn:active{transform:scale(.95)}
.controls-section{background:linear-gradient(180deg,#0b1220 0%, var(--card) 100%);border:1px solid #1f2937;border-radius:12px;padding:12px}
.btn:disabled{opacity:.5;cursor:not-allowed}
.toast{position:fixed;bottom:20px;left:50%;transform:translateX(-50%) translateY(100px);background:#0b1220;border:1px solid #1f2937;border-radius:10px;padding:12px 20px;color:#fff;font-size:14px;box-shadow:0 4px 12px rgba(0,0,0,.3);opacity:0;transition:all .3s;z-index:2000;pointer-events:none}
.toast.show{transform:translateX(-50%) translateY(0);opacity:1}
.toast.success{border-color:#22c55e}
.toast.error{border-color:#ef4444}
</style>
</head>
<body>
<div class="container">
<div class="header">
<h1>ESP32 Car Control</h1>
<div class="header-info">
<div class="status-indicator">
<span class="status-dot" id="streamStatus"></span>
<span id="streamStatusText">Đang kết nối...</span>
</div>
<label for="modeSel">Chế độ:</label>
<select id="modeSel">
<option value="manual">Manual</option>
<option value="line">Line follow</option>
</select>
<span id="modeBadge" class="badge">mode: manual</span>
</div>
</div>
<div class="camera-section">
<div class="camera-wrapper">
<div class="camera-loading" id="cameraLoading">
<div class="spinner"></div>
<div>Đang tải video stream...</div>
</div>
<img id="cameraStream" style="display:none" alt="Camera Stream">
<button class="capture-btn" id="captureBtn" title="Chụp ảnh">📷</button>
</div>
</div>
<div class="controls-section">
<div class="controls">
<button class="btn acc hold" data-path="/fwd_left">↖</button>
<button class="btn acc hold" data-path="/forward">↑</button>
<button class="btn acc hold" data-path="/fwd_right">↗</button>
<button class="btn rot hold" data-path="/left">←</button>
<button class="btn stop" id="stopBtn" data-path="/stop">■</button>
<button class="btn rot hold" data-path="/right">→</button>
<button class="btn acc hold" data-path="/back_left">↙</button>
<button class="btn acc hold" data-path="/backward">↓</button>
<button class="btn acc hold" data-path="/back_right">↘</button>
</div>
<div class="speed">
<div class="pill" id="spdText">Lin: -- | Rot: --</div>
<button class="btn spd" data-path="/speed/lin/down">Lin −</button>
<button class="btn spd" data-path="/speed/lin/up">Lin +</button>
<button class="btn spd" data-path="/speed/rot/down">Rot −</button>
<button class="btn spd" data-path="/speed/rot/up">Rot +</button>
</div>
</div>
</div>
<div id="overlay" class="overlay"><div class="box">Đang ở chế độ Line follow. Điều khiển tay bị khóa.</div></div>
<div id="toast" class="toast"></div>
<script>
document.addEventListener('contextmenu', e=>e.preventDefault());
// Use proxy endpoints to avoid CORS issues
// Proxy endpoints are handled by ESP32 Car server
const STREAM_URL = '/camera/stream';
const CAPTURE_URL = '/camera/capture';

const overlay = document.getElementById('overlay');
const modeSel = document.getElementById('modeSel');
const modeBadge = document.getElementById('modeBadge');
const cameraStream = document.getElementById('cameraStream');
const cameraLoading = document.getElementById('cameraLoading');
const captureBtn = document.getElementById('captureBtn');
const streamStatus = document.getElementById('streamStatus');
const streamStatusText = document.getElementById('streamStatusText');
const toast = document.getElementById('toast');

let streamReconnectTimer = null;
let isStreamConnected = false;

function showToast(message, type = 'success') {
  toast.textContent = message;
  toast.className = `toast ${type}`;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

function updateStreamStatus(connected) {
  isStreamConnected = connected;
  if (connected) {
    streamStatus.classList.add('connected');
    streamStatusText.textContent = 'Đã kết nối';
  } else {
    streamStatus.classList.remove('connected');
    streamStatusText.textContent = 'Mất kết nối';
  }
}

function startStream() {
  cameraLoading.style.display = 'flex';
  cameraStream.style.display = 'none';
  updateStreamStatus(false);
  
  cameraStream.src = STREAM_URL + '?t=' + Date.now();
  
  cameraStream.onload = () => {
    cameraLoading.style.display = 'none';
    cameraStream.style.display = 'block';
    updateStreamStatus(true);
    if (streamReconnectTimer) {
      clearInterval(streamReconnectTimer);
      streamReconnectTimer = null;
    }
  };
  
  cameraStream.onerror = () => {
    cameraLoading.style.display = 'flex';
    cameraStream.style.display = 'none';
    updateStreamStatus(false);
    if (!streamReconnectTimer) {
      streamReconnectTimer = setInterval(() => {
        console.log('Reconnecting stream...');
        startStream();
      }, 3000);
    }
  };
}

async function capturePhoto() {
  try {
    captureBtn.disabled = true;
    const response = await fetch(CAPTURE_URL);
    if (!response.ok) throw new Error('Capture failed');
    
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    a.href = url;
    a.download = `esp32-cam-${timestamp}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('Đã lưu ảnh thành công!', 'success');
  } catch (error) {
    console.error('Capture error:', error);
    showToast('Lỗi khi chụp ảnh', 'error');
  } finally {
    captureBtn.disabled = false;
  }
}

captureBtn.addEventListener('click', capturePhoto);
startStream();

function uiLock(isLocked){
 overlay.classList.toggle('show', isLocked);
 document.querySelectorAll('.hold, .spd, #stopBtn')
 .forEach(b => b.disabled = isLocked);
}
async function send(path){
 try{ await fetch(path); }catch(e){}
}
async function refreshSpeed(){
 try{
 const r=await fetch('/speed');
 document.getElementById('spdText').textContent=await r.text();
 }catch(e){}
}
async function refreshMode(){
 try{
 const r = await fetch('/getMode');
 const m = await r.text();
 modeSel.value = m;
 modeBadge.textContent = 'mode: ' + m;
 uiLock(m !== 'manual');
 }catch(e){}
}
modeSel.addEventListener('change', async ()=>{
 try{
 const r = await fetch('/setMode?m=' + modeSel.value);
 const m = await r.text();
 modeBadge.textContent = 'mode: ' + m;
 uiLock(m !== 'manual');
 }catch(e){}
});
let activeHold = { btn:null, pointerId:null };
function guardManual(handler){
 return function(e){
 if (modeSel.value !== 'manual') {
 e.preventDefault();
 return;
 }
 return handler(e);
 }
}
document.querySelectorAll('.hold').forEach(btn=>{
 btn.addEventListener('pointerdown', guardManual(e=>{
 e.preventDefault();
 activeHold = { btn, pointerId: e.pointerId };
 btn.classList.add('active');
 btn.setPointerCapture(e.pointerId);
 send(btn.dataset.path);
 }), {passive:false});
 const release = guardManual(e=>{
 e.preventDefault();
 if (activeHold.btn === btn && activeHold.pointerId === e.pointerId) {
 btn.classList.remove('active');
 send('/stop');
 activeHold = { btn:null, pointerId:null };
 }
 try{ btn.releasePointerCapture(e.pointerId); }catch(_){}
 });
 btn.addEventListener('pointerup', release, {passive:false});
 btn.addEventListener('pointercancel', release, {passive:false});
 btn.addEventListener('pointerleave', release, {passive:false});
});
document.getElementById('stopBtn').addEventListener('pointerdown', guardManual(e=>{
 e.preventDefault();
 send('/stop');
}), {passive:false});
document.querySelectorAll('.spd').forEach(b=>{
 b.addEventListener('pointerdown', guardManual(async e=>{
 e.preventDefault();
 await send(b.dataset.path);
 refreshSpeed();
 }), {passive:false});
});
refreshMode();
refreshSpeed();
</script>
</body>
</html>
)rawliteral";

// ================= Motion state =================
enum Motion { STOPPED, FWD, BWD, LEFT_TURN, RIGHT_TURN, FWD_LEFT, FWD_RIGHT, BACK_LEFT, BACK_RIGHT };
volatile Motion curMotion = STOPPED;

// ======= Prototypes
void forward();
void backward();
void left();
void right();
void stopCar();
void forwardLeft();
void forwardRight();
void backwardLeft();
void backwardRight();
void applyCurrentMotion();
const char* motionToString(Motion m);

// ================= WiFi Setup =================
void setupWiFi() {
  Serial.begin(115200);
  delay(1000);
  
  if (WIFI_STA_ONLY) {
    // STA-only mode: Chỉ kết nối WiFi router
    WiFi.mode(WIFI_STA);
    Serial.print("Connecting to WiFi: ");
    Serial.println(sta_ssid);
    
    WiFi.begin(sta_ssid, sta_password);
    
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 30) {
      delay(500);
      Serial.print(".");
      attempts++;
    }
    
    if (WiFi.status() == WL_CONNECTED) {
      Serial.println("");
      Serial.print("WiFi connected! IP address: ");
      Serial.println(WiFi.localIP());
      
      // Setup mDNS (ESP32-Car.local)
      if (MDNS.begin("esp32-car")) {
        Serial.println("mDNS responder started: esp32-car.local");
      } else {
        Serial.println("Error setting up MDNS responder!");
      }
    } else {
      Serial.println("");
      Serial.println("WiFi connection FAILED!");
      Serial.println("ESP32 sẽ không hoạt động. Vui lòng kiểm tra:");
      Serial.println("1. SSID và password đúng chưa");
      Serial.println("2. Router có bật không");
      Serial.println("3. Đổi WIFI_STA_ONLY = false để dùng AP mode");
    }
  } else {
    // AP+STA mode: Vừa tạo hotspot, vừa kết nối router
    WiFi.mode(WIFI_AP_STA);
    
    // Configure SoftAP
    WiFi.softAP(ap_ssid, ap_password);
    IPAddress APIP = WiFi.softAPIP();
    Serial.print("AP IP address: ");
    Serial.println(APIP);
    
    // Try to connect to STA network (if configured)
    if (strlen(sta_ssid) > 0 && strcmp(sta_ssid, "YOUR_WIFI") != 0) {
      Serial.print("Connecting to STA: ");
      Serial.println(sta_ssid);
      WiFi.begin(sta_ssid, sta_password);
      
      int attempts = 0;
      while (WiFi.status() != WL_CONNECTED && attempts < 20) {
        delay(500);
        Serial.print(".");
        attempts++;
      }
      
      if (WiFi.status() == WL_CONNECTED) {
        Serial.println("");
        Serial.print("STA connected! IP: ");
        Serial.println(WiFi.localIP());
        
        // Setup mDNS
        if (MDNS.begin("esp32-car")) {
          Serial.println("mDNS responder started: esp32-car.local");
        }
      } else {
        Serial.println("");
        Serial.println("STA connection failed, continuing with AP only");
      }
    } else {
      Serial.println("STA not configured, using AP only");
    }
  }
}

// ================= Setup =================
void setup() {
  // Motor pins
  pinMode(IN1, OUTPUT);
  pinMode(IN2, OUTPUT);
  pinMode(IN3, OUTPUT);
  pinMode(IN4, OUTPUT);
  pinMode(ENA, OUTPUT);
  pinMode(ENB, OUTPUT);
  
  stopCar();
  
  // Initialize line-follow module (for ultrasonic sensor)
  do_line_setup();
  
  // Setup WiFi (AP+STA mode)
  setupWiFi();
  
  // Initialize MQTT
  mqtt_init();
  
  // UI Server
  server.on("/", HTTP_GET, [](AsyncWebServerRequest *req){
    req->send_P(200, "text/html", index_html);
  });
  
  // Mode APIs
  server.on("/getMode", HTTP_GET, [](AsyncWebServerRequest* r){
    r->send(200, "text/plain", (currentMode==MODE_LINE)?"line":"manual");
  });
  
  server.on("/setMode", HTTP_GET, [](AsyncWebServerRequest* r){
    if (!r->hasParam("m")) {
      r->send(400,"text/plain","manual");
      return;
    }
    String m = r->getParam("m")->value();
    if (m=="line") {
      stopCar();
      do_line_setup();
      lineInited = true;
      currentMode = MODE_LINE;
      line_mode = true;
    } else {
      do_line_abort(); // Stop any line-follow operations
      stopCar();
      currentMode = MODE_MANUAL;
      line_mode = false;
    }
    r->send(200,"text/plain",(currentMode==MODE_LINE)?"line":"manual");
  });
  
  // Moves (Manual only)
  server.on("/forward", HTTP_GET, [](AsyncWebServerRequest *r){
    curMotion=FWD;
    if(currentMode==MODE_MANUAL) forward();
    r->send(200,"text/plain","OK");
  });
  
  server.on("/backward", HTTP_GET, [](AsyncWebServerRequest *r){
    curMotion=BWD;
    if(currentMode==MODE_MANUAL) backward();
    r->send(200,"text/plain","OK");
  });
  
  server.on("/left", HTTP_GET, [](AsyncWebServerRequest *r){
    curMotion=LEFT_TURN;
    if(currentMode==MODE_MANUAL) left();
    r->send(200,"text/plain","OK");
  });
  
  server.on("/right", HTTP_GET, [](AsyncWebServerRequest *r){
    curMotion=RIGHT_TURN;
    if(currentMode==MODE_MANUAL) right();
    r->send(200,"text/plain","OK");
  });
  
  server.on("/stop", HTTP_GET, [](AsyncWebServerRequest *r){
    curMotion=STOPPED;
    if(currentMode==MODE_MANUAL) stopCar();
    r->send(200,"text/plain","OK");
  });
  
  // Diagonals (Manual only)
  server.on("/fwd_left", HTTP_GET, [](AsyncWebServerRequest *r){
    curMotion=FWD_LEFT;
    if(currentMode==MODE_MANUAL) forwardLeft();
    r->send(200,"text/plain","OK");
  });
  
  server.on("/fwd_right", HTTP_GET, [](AsyncWebServerRequest *r){
    curMotion=FWD_RIGHT;
    if(currentMode==MODE_MANUAL) forwardRight();
    r->send(200,"text/plain","OK");
  });
  
  server.on("/back_left", HTTP_GET, [](AsyncWebServerRequest *r){
    curMotion=BACK_LEFT;
    if(currentMode==MODE_MANUAL) backwardLeft();
    r->send(200,"text/plain","OK");
  });
  
  server.on("/back_right", HTTP_GET, [](AsyncWebServerRequest *r){
    curMotion=BACK_RIGHT;
    if(currentMode==MODE_MANUAL) backwardRight();
    r->send(200,"text/plain","OK");
  });
  
  // Speed (Manual only applyCurrentMotion)
  server.on("/speed/lin/up", HTTP_GET, [](AsyncWebServerRequest *r){
    speed_linear = clamp(speed_linear+SPEED_STEP, SPEED_MIN, SPEED_MAX);
    if(currentMode==MODE_MANUAL) applyCurrentMotion();
    r->send(200,"text/plain","OK");
  });
  
  server.on("/speed/lin/down", HTTP_GET, [](AsyncWebServerRequest *r){
    speed_linear = clamp(speed_linear-SPEED_STEP, SPEED_MIN, SPEED_MAX);
    if(currentMode==MODE_MANUAL) applyCurrentMotion();
    r->send(200,"text/plain","OK");
  });
  
  server.on("/speed/rot/up", HTTP_GET, [](AsyncWebServerRequest *r){
    speed_rot = clamp(speed_rot+SPEED_STEP, SPEED_MIN, SPEED_MAX);
    if(currentMode==MODE_MANUAL) applyCurrentMotion();
    r->send(200,"text/plain","OK");
  });
  
  server.on("/speed/rot/down", HTTP_GET, [](AsyncWebServerRequest *r){
    speed_rot = clamp(speed_rot-SPEED_STEP, SPEED_MIN, SPEED_MAX);
    if(currentMode==MODE_MANUAL) applyCurrentMotion();
    r->send(200,"text/plain","OK");
  });
  
  server.on("/speed", HTTP_GET, [](AsyncWebServerRequest *r){
    String s = "Lin: " + String(speed_linear) + " | Rot: " + String(speed_rot);
    r->send(200,"text/plain", s);
  });
  
  // Get IP address endpoint (useful for STA mode)
  server.on("/getIP", HTTP_GET, [](AsyncWebServerRequest *r){
    IPAddress ip = WiFi.localIP();
    String ipStr = String(ip[0]) + "." + String(ip[1]) + "." + String(ip[2]) + "." + String(ip[3]);
    r->send(200, "text/plain", ipStr);
  });
  
  // Get WiFi info endpoint
  server.on("/getWiFiInfo", HTTP_GET, [](AsyncWebServerRequest *r){
    String json = "{";
    json += "\"ssid\":\"" + String(WiFi.SSID()) + "\",";
    json += "\"ip\":\"" + WiFi.localIP().toString() + "\",";
    json += "\"rssi\":" + String(WiFi.RSSI()) + ",";
    json += "\"mode\":\"" + String(WIFI_STA_ONLY ? "STA" : "AP+STA") + "\"";
    if (!WIFI_STA_ONLY) {
      json += ",\"ap_ip\":\"" + WiFi.softAPIP().toString() + "\"";
    }
    json += "}";
    r->send(200, "application/json", json);
  });
  
  // Camera stream proxy (redirect to avoid CORS - browser will load directly)
  // Note: This redirects to ESP32-CAM, so browser loads from same origin perspective
  server.on("/camera/stream", HTTP_GET, [](AsyncWebServerRequest *r){
    String url = "http://" + String(CAMERA_IP) + ":81/stream";
    r->redirect(url);
  });
  
  // Camera capture proxy
  server.on("/camera/capture", HTTP_GET, [](AsyncWebServerRequest *r){
    HTTPClient http;
    String url = "http://" + String(CAMERA_IP) + "/capture";
    http.begin(url);
    http.setTimeout(5000);
    
    int httpCode = http.GET();
    if (httpCode == HTTP_CODE_OK) {
      // Get image data
      int len = http.getSize();
      uint8_t* buffer = (uint8_t*)malloc(len);
      if (buffer) {
        http.getStream().readBytes(buffer, len);
        // Create response with CORS header using beginResponse_P
        AsyncWebServerResponse *response = r->beginResponse_P(200, "image/jpeg", buffer, len);
        response->addHeader("Access-Control-Allow-Origin", "*");
        r->send(response);
        free(buffer);
      } else {
        r->send(500, "text/plain", "Memory allocation failed");
      }
    } else {
      r->send(500, "text/plain", "Failed to capture image");
    }
    http.end();
  });
  
  server.begin();
  Serial.println("HTTP server started");
  
  // Add mDNS service
  MDNS.addService("http", "tcp", 80);
}

// ================= Loop =================
void loop() {
  // Always call MQTT loop (non-blocking)
  mqtt_loop();
  
  if (currentMode == MODE_LINE) {
    // Line-follow mode: do_line handles everything
    do_line_loop();
    
    // Check for obstacle state change and publish event
    float dist = do_line_getDistanceCM();
    bool obstacle_now = (dist > 0 && dist < OBSTACLE_TH_CM);
    if (obstacle_now != obstacle_prev_state) {
      if (obstacle_now) {
        // Obstacle detected
        mqtt_publishObstacleEvent(dist);
      }
      obstacle_prev_state = obstacle_now;
    }
    
    // Publish telemetry
    mqtt_publishTelemetryWithState("line", "line_follow", speed_linear, speed_rot);
    
  } else {
    // Manual mode
    if (line_mode) {
      stopCar();
      line_mode = false;
    }
    
    // Update ultrasonic sensor thường xuyên (cần cho state machine hoạt động)
    do_line_updateUltrasonic();
    
    // Publish telemetry with current motion state
    const char* mode_str = "manual";
    const char* motion_str = motionToString(curMotion);
    mqtt_publishTelemetryWithState(mode_str, motion_str, speed_linear, speed_rot);
    
    // Check obstacle in manual mode - dừng xe tự động khi có vật cản
    float dist = do_line_getDistanceCM();
    bool obstacle_now = (dist > 0 && dist < OBSTACLE_TH_CM);
    
    // Phát hiện vật cản → dừng xe tự động (chỉ khi đang di chuyển)
    if (obstacle_now) {
      // Chỉ dừng nếu đang di chuyển (forward, backward, diagonal)
      if (curMotion == FWD || curMotion == BWD || 
          curMotion == FWD_LEFT || curMotion == FWD_RIGHT ||
          curMotion == BACK_LEFT || curMotion == BACK_RIGHT) {
        stopCar();
        curMotion = STOPPED;
        Serial.print("[OBSTACLE] Vật cản phát hiện ở ");
        Serial.print(dist, 1);
        Serial.println(" cm - Đã dừng xe tự động!");
      }
    }
    
    // Publish event khi state thay đổi
    if (obstacle_now != obstacle_prev_state) {
      if (obstacle_now) {
        mqtt_publishObstacleEvent(dist);
        Serial.print("[MQTT] Obstacle event published: ");
        Serial.print(dist, 1);
        Serial.println(" cm");
      }
      obstacle_prev_state = obstacle_now;
    }
    
    delay(5); // Manual mode doesn't need tight loop
  }
}

// ================= Motion to String =================
const char* motionToString(Motion m){
  switch(m){
    case FWD: return "forward";
    case BWD: return "backward";
    case LEFT_TURN: return "left";
    case RIGHT_TURN: return "right";
    case FWD_LEFT: return "fwd_left";
    case FWD_RIGHT: return "fwd_right";
    case BACK_LEFT: return "back_left";
    case BACK_RIGHT: return "back_right";
    default: return "stop";
  }
}

// ================= Apply current motion (Manual) =================
void applyCurrentMotion(){
  switch(curMotion){
    case FWD: forward(); break;
    case BWD: backward(); break;
    case LEFT_TURN: left(); break;
    case RIGHT_TURN: right(); break;
    case FWD_LEFT: forwardLeft(); break;
    case FWD_RIGHT: forwardRight(); break;
    case BACK_LEFT: backwardLeft(); break;
    case BACK_RIGHT: backwardRight(); break;
    default: stopCar(); break;
  }
}

// ================= Motor control (Manual) =================
void forward() {
  digitalWrite(IN1,HIGH);
  digitalWrite(IN2,LOW);
  digitalWrite(IN3,HIGH);
  digitalWrite(IN4,LOW);
  analogWrite(ENA, speed_linear);
  analogWrite(ENB, speed_linear);
}

void backward() {
  digitalWrite(IN1,LOW);
  digitalWrite(IN2,HIGH);
  digitalWrite(IN3,LOW);
  digitalWrite(IN4,HIGH);
  analogWrite(ENA, speed_linear);
  analogWrite(ENB, speed_linear);
}

void left() {
  // quay tại chỗ
  digitalWrite(IN1,LOW);
  digitalWrite(IN2,HIGH);
  digitalWrite(IN3,HIGH);
  digitalWrite(IN4,LOW);
  analogWrite(ENA, speed_rot);
  analogWrite(ENB, speed_rot);
}

void right() {
  // quay tại chỗ
  digitalWrite(IN1,HIGH);
  digitalWrite(IN2,LOW);
  digitalWrite(IN3,LOW);
  digitalWrite(IN4,HIGH);
  analogWrite(ENA, speed_rot);
  analogWrite(ENB, speed_rot);
}

void stopCar() {
  digitalWrite(IN1,LOW);
  digitalWrite(IN2,LOW);
  digitalWrite(IN3,LOW);
  digitalWrite(IN4,LOW);
  analogWrite(ENA, 0);
  analogWrite(ENB, 0);
}

// ========= Diagonal steering (Manual) =========
void forwardLeft() {
  digitalWrite(IN1,HIGH);
  digitalWrite(IN2,LOW);
  digitalWrite(IN3,HIGH);
  digitalWrite(IN4,LOW);
  if (!INVERT_STEER) {
    // giảm TRÁI
    analogWrite(ENA, speed_linear);
    analogWrite(ENB, diagScale(speed_linear));
  } else {
    // giảm PHẢI
    analogWrite(ENA, diagScale(speed_linear));
    analogWrite(ENB, speed_linear);
  }
}

void forwardRight() {
  digitalWrite(IN1,HIGH);
  digitalWrite(IN2,LOW);
  digitalWrite(IN3,HIGH);
  digitalWrite(IN4,LOW);
  if (!INVERT_STEER) {
    // giảm PHẢI
    analogWrite(ENA, diagScale(speed_linear));
    analogWrite(ENB, speed_linear);
  } else {
    // giảm TRÁI
    analogWrite(ENA, speed_linear);
    analogWrite(ENB, diagScale(speed_linear));
  }
}

void backwardLeft() {
  digitalWrite(IN1,LOW);
  digitalWrite(IN2,HIGH);
  digitalWrite(IN3,LOW);
  digitalWrite(IN4,HIGH);
  analogWrite(ENA, diagScale(speed_linear)); // bánh PHẢI chậm hơn
  analogWrite(ENB, speed_linear);
}

void backwardRight() {
  digitalWrite(IN1,LOW);
  digitalWrite(IN2,HIGH);
  digitalWrite(IN3,LOW);
  digitalWrite(IN4,HIGH);
  analogWrite(ENA, speed_linear);
  analogWrite(ENB, diagScale(speed_linear)); // bánh TRÁI chậm hơn
}
