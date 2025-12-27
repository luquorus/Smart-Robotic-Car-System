# Quick Start Guide

## Bước 1: Cài đặt dependencies

```bash
npm install
npx expo install react-native-webview
```

## Bước 2: Chạy app

```bash
npm start
```

Sau đó:
- Nhấn `a` để chạy trên Android
- Nhấn `i` để chạy trên iOS
- Quét QR code bằng Expo Go app

## Build APK

```bash
# Cài EAS CLI (lần đầu)
npm install -g eas-cli

# Đăng nhập
eas login

# Build
eas build --platform android --profile preview
```

## Troubleshooting

- **Không kết nối được ESP32**: Đảm bảo cùng WiFi hoặc kết nối vào "ESP32-Car"
- **WebView trống**: Kiểm tra `WEB_URL` và đảm bảo ESP32 đang chạy
- **Lỗi build**: Chạy `npx expo install --fix` để cập nhật dependencies

