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

### Lỗi `net::ERR_ADDRESS_UNREACHABLE` trên Expo Go

Đây là lỗi phổ biến khi điện thoại không kết nối được với Expo development server. Thử các giải pháp sau:

#### Giải pháp 1: Đảm bảo cùng mạng WiFi
- **Điện thoại và máy tính phải cùng một mạng WiFi**
- Kiểm tra IP address hiển thị trong Expo CLI có đúng không
- Thử tắt/bật WiFi trên điện thoại

#### Giải pháp 2: Sử dụng Tunnel Mode (Khuyến nghị)
```bash
# Chạy với tunnel mode (hoạt động ngay cả khi khác mạng)
npm run start:tunnel
# hoặc
npx expo start --tunnel
```
**Lưu ý:** Tunnel mode có thể chậm hơn nhưng hoạt động ổn định hơn.

#### Giải pháp 3: Sử dụng LAN Mode
```bash
# Chạy với LAN mode (nhanh hơn nếu cùng mạng)
npm run start:lan
# hoặc
npx expo start --lan
```

#### Giải pháp 4: Tắt Firewall tạm thời
- **Windows:** Tắt Windows Firewall tạm thời hoặc cho phép Node.js qua firewall
- **Mac:** Kiểm tra System Preferences > Security & Privacy > Firewall

#### Giải pháp 5: Nhập URL thủ công
1. Mở Expo Go app
2. Nhấn "Enter URL manually"
3. Nhập URL hiển thị trong terminal (ví dụ: `exp://192.168.1.100:8081`)

#### Giải pháp 6: Reset Expo
```bash
# Xóa cache và khởi động lại
npx expo start --clear
```

### Các lỗi khác

- **Không kết nối được ESP32**: Đảm bảo cùng WiFi hoặc kết nối vào "ESP32-Car"
- **WebView trống**: Kiểm tra `WEB_URL` trong `App.tsx` và đảm bảo ESP32 đang chạy
- **Lỗi build**: Chạy `npx expo install --fix` để cập nhật dependencies

