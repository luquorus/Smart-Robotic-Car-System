# ESP32 Car Controller - React Native App

Ứng dụng React Native (Expo) đơn giản để điều khiển ESP32 Car thông qua WebView.

## Cài đặt

```bash
# Cài đặt dependencies
npm install

# Hoặc
yarn install

# Cài đặt react-native-webview (nếu chưa có)
npx expo install react-native-webview
```

## Chạy ứng dụng

```bash
# Khởi động Expo
npm start

# Chạy trên Android
npm run android

# Chạy trên iOS
npm run ios
```

## Cấu hình

### Cách 1: Load web trực tiếp từ ESP32 (Mặc định)

Mở file `App.tsx` và đảm bảo:
- `LOAD_MODE = "url"`
- `WEB_URL = "http://192.168.4.1/"` (hoặc IP của ESP32)

**Lưu ý:** Đảm bảo điện thoại và ESP32 cùng mạng WiFi, hoặc kết nối vào WiFi "ESP32-Car" nếu ESP32 ở chế độ AP.

### Cách 2: Load web từ HTML local

1. Mở file `webContent.ts`
2. Copy toàn bộ HTML/CSS/JS từ ESP32 (phần `index_html` trong code Arduino)
3. Dán vào giữa dấu backtick (``) trong biến `WEB_HTML`, thay thế phần mẫu
4. Trong `App.tsx`:
   - Đổi `LOAD_MODE = "html"`
   - Uncomment dòng `import { WEB_HTML } from "./webContent";`
   - Uncomment dòng `source = { html: WEB_HTML };` trong phần if

## Build APK

```bash
# Cài đặt EAS CLI (nếu chưa có)
npm install -g eas-cli

# Đăng nhập EAS
eas login

# Build APK
eas build --platform android --profile preview
```

## Lưu ý

- Đảm bảo điện thoại và ESP32 cùng mạng WiFi
- Nếu ESP32 ở chế độ AP, kết nối điện thoại vào WiFi "ESP32-Car" (password: 12345678)
- App yêu cầu quyền INTERNET để kết nối ESP32

