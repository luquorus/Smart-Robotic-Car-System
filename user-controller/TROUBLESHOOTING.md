# Hướng dẫn Khắc phục Sự cố

## Lỗi `net::ERR_ADDRESS_UNREACHABLE` trên Expo Go

### Nguyên nhân
Lỗi này xảy ra khi Expo Go app trên điện thoại không thể kết nối đến Expo development server trên máy tính của bạn.

### Giải pháp theo thứ tự ưu tiên

#### ✅ Giải pháp 1: Sử dụng Tunnel Mode (Khuyến nghị nhất)
Tunnel mode hoạt động ngay cả khi điện thoại và máy tính ở khác mạng WiFi.

```bash
cd user-controller
npm run start:tunnel
```

**Ưu điểm:**
- Hoạt động ngay cả khi khác mạng
- Không cần cấu hình firewall
- Dễ sử dụng nhất

**Nhược điểm:**
- Có thể chậm hơn một chút
- Cần kết nối internet

#### ✅ Giải pháp 2: Đảm bảo cùng mạng WiFi
1. Kiểm tra điện thoại và máy tính đang kết nối cùng một WiFi
2. Chạy lệnh:
```bash
npm run start:lan
```
3. Quét lại QR code

#### ✅ Giải pháp 3: Cấu hình Firewall Windows

**Cách 1: Cho phép Node.js qua Firewall**
1. Mở Windows Defender Firewall
2. Chọn "Allow an app or feature through Windows Defender Firewall"
3. Tìm "Node.js" và tick cả "Private" và "Public"
4. Nếu không thấy, nhấn "Allow another app" và thêm Node.js

**Cách 2: Tắt Firewall tạm thời (chỉ để test)**
1. Mở Windows Security
2. Firewall & network protection
3. Tắt tạm thời để test

#### ✅ Giải pháp 4: Nhập URL thủ công
1. Mở Expo Go app
2. Nhấn "Enter URL manually" hoặc "Connection" ở góc dưới
3. Nhập URL từ terminal (ví dụ: `exp://192.168.1.100:8081`)
4. Nhấn "Connect"

#### ✅ Giải pháp 5: Reset và Clear Cache
```bash
# Xóa cache Expo
npx expo start --clear

# Hoặc xóa node_modules và cài lại
rm -rf node_modules
npm install
npx expo start --clear
```

#### ✅ Giải pháp 6: Kiểm tra Port
Đảm bảo port 8081 (mặc định của Expo) không bị chặn:
```bash
# Kiểm tra port có đang được sử dụng không
netstat -ano | findstr :8081
```

Nếu port bị chiếm, kill process đó hoặc dùng port khác:
```bash
npx expo start --port 8082
```

### Kiểm tra kết nối

1. **Kiểm tra IP address:**
   - Trong terminal Expo, bạn sẽ thấy URL như: `exp://192.168.1.100:8081`
   - Đảm bảo IP này đúng với IP của máy tính bạn

2. **Test kết nối từ điện thoại:**
   - Mở trình duyệt trên điện thoại
   - Truy cập: `http://[IP_MÁY_TÍNH]:8081` (ví dụ: `http://192.168.1.100:8081`)
   - Nếu không mở được, có vấn đề về network/firewall

3. **Kiểm tra Expo Go version:**
   - Đảm bảo Expo Go app đã cập nhật lên phiên bản mới nhất

### Lỗi liên quan đến ESP32

Nếu app đã load nhưng không kết nối được ESP32:

1. **Kiểm tra WEB_URL trong App.tsx:**
   ```typescript
   const WEB_URL = "http://192.168.0.108/"; // Đảm bảo IP này đúng
   ```

2. **Kiểm tra ESP32 đang chạy:**
   - Mở trình duyệt trên máy tính, truy cập IP của ESP32
   - Nếu không mở được, ESP32 có thể chưa khởi động hoặc IP sai

3. **Kiểm tra cùng mạng:**
   - Điện thoại và ESP32 phải cùng WiFi
   - Hoặc điện thoại kết nối vào WiFi "ESP32-Car" (nếu ESP32 ở chế độ AP)

### Vẫn không được?

1. Thử trên emulator thay vì điện thoại thật:
   ```bash
   npm run android  # Cho Android
   npm run ios      # Cho iOS (chỉ trên Mac)
   ```

2. Kiểm tra log chi tiết:
   ```bash
   npx expo start --verbose
   ```

3. Thử build APK thay vì dùng Expo Go:
   ```bash
   npm install -g eas-cli
   eas login
   eas build --platform android --profile preview
   ```

