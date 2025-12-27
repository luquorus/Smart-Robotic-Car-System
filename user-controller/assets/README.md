# Assets Folder

Thư mục này chứa các file assets cho app (icon, splash screen, etc.).

## Tạo assets (tùy chọn)

Expo có thể tự tạo assets mặc định, nhưng bạn có thể tạo custom:

1. **Icon**: `icon.png` (1024x1024px)
2. **Splash**: `splash.png` (1242x2436px)
3. **Adaptive Icon (Android)**: `adaptive-icon.png` (1024x1024px)
4. **Favicon (Web)**: `favicon.png` (48x48px)

Hoặc dùng Expo CLI để generate:

```bash
npx expo install @expo/vector-icons
```

App vẫn chạy được nếu không có assets (Expo sẽ dùng mặc định).

