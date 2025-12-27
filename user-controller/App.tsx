import React from "react";
import { SafeAreaView, StyleSheet, StatusBar } from "react-native";
import { WebView } from "react-native-webview";

// ================= CONFIGURATION =================
// Cách 1: Load web trực tiếp từ ESP32
const WEB_URL = "http://192.168.0.108/";

// Cách 2: Load web từ HTML local
// Uncomment dòng dưới để dùng HTML local:
// import { WEB_HTML } from "./webContent";

// Chọn cách sử dụng: "url" hoặc "html"
const LOAD_MODE: "url" | "html" = "url";
// =================================================

export default function App() {
  // Tự động chọn source dựa trên LOAD_MODE
  let source;
  if (LOAD_MODE === "html") {
    // Uncomment dòng dưới khi dùng HTML local:
    // source = { html: WEB_HTML };
    source = { uri: WEB_URL }; // Fallback nếu chưa import WEB_HTML
  } else {
    source = { uri: WEB_URL };
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <WebView
        source={source}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        originWhitelist={["*"]}
        allowsFullscreenVideo={true}
        startInLoadingState={true}
        scalesPageToFit={true}
        // Bật các tính năng cần thiết cho ESP32 control
        mixedContentMode="always"
        // Cho phép truy cập file system (nếu cần)
        allowFileAccess={true}
        // Bật cache để tải nhanh hơn
        cacheEnabled={true}
        // Bật third-party cookies (nếu ESP32 cần)
        thirdPartyCookiesEnabled={true}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  webview: {
    flex: 1,
  },
});

