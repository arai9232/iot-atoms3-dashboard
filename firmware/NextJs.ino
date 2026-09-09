/***************************************************
  AtomS3 + ENV.IV ユニット (SHT40 温湿度センサー) から
  Next.js アプリ (Railway) の /api/readings へ気温・湿度を送信する
 ****************************************************/
#include "M5AtomS3.h"
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include "Adafruit_SHT4x.h"
#include <HTTPClient.h>

// WiFi情報（コミット前に自分の環境の値に書き換えること。実際の値はgit管理しない）
const char* ssid = "your-ssid"; // 各自のルータのSSIDを記入
const char* password = "your-password"; // 各自のルータのパスワードを記入

// true: ローカルのNext.js(npm run dev)へ送信 / false: Railway本番へ送信
const bool USE_LOCAL_SERVER = true;

// ローカル確認用（PCとAtomS3を同じWi-Fiに接続し、PCのLAN IPを指定。httpでよい）
const char* localServerName = "http://192.168.x.x:3000/api/readings"; // PCのLAN IPに置き換える
const char* localApiKey = "dev-secret-key"; // .env.local の API_KEY と一致させる

// Railway本番用
const char* prodServerName = "https://xxxx.up.railway.app/api/readings"; // RailwayのデプロイURLに置き換える
const char* prodApiKey = "change-me-to-a-random-secret"; // サーバーの .env の API_KEY と同じ値にする

const char* deviceId = "atoms3-01";

// 送信間隔（ローカル確認中は短め、本番運用時は電池を考慮して長めが目安）
const unsigned long SEND_INTERVAL_MS = USE_LOCAL_SERVER ? (1000UL * 15) : (1000UL * 60 * 60);

Adafruit_SHT4x sht4 = Adafruit_SHT4x();

void setup() {
  M5.begin();
  Serial.begin(115200);
  // WiFi接続
  connectToWiFi();

  Serial.println("Adafruit SHT4x test");
  if (! sht4.begin()) {
    Serial.println("Couldn't find SHT4x");
    while (1) delay(1);
  }
  Serial.println("Found SHT4x sensor");
  Serial.print("Serial number 0x");
  Serial.println(sht4.readSerial(), HEX);

  // You can have 3 different precisions, higher precision takes longer
  sht4.setPrecision(SHT4X_HIGH_PRECISION);
  switch (sht4.getPrecision()) {
     case SHT4X_HIGH_PRECISION:
       Serial.println("High precision");
       break;
     case SHT4X_MED_PRECISION:
       Serial.println("Med precision");
       break;
     case SHT4X_LOW_PRECISION:
       Serial.println("Low precision");
       break;
  }

  // You can have 6 different heater settings
  // higher heat and longer times uses more power
  // and reads will take longer too!
  sht4.setHeater(SHT4X_NO_HEATER);
  switch (sht4.getHeater()) {
     case SHT4X_NO_HEATER:
       Serial.println("No heater");
       break;
     case SHT4X_HIGH_HEATER_1S:
       Serial.println("High heat for 1 second");
       break;
     case SHT4X_HIGH_HEATER_100MS:
       Serial.println("High heat for 0.1 second");
       break;
     case SHT4X_MED_HEATER_1S:
       Serial.println("Medium heat for 1 second");
       break;
     case SHT4X_MED_HEATER_100MS:
       Serial.println("Medium heat for 0.1 second");
       break;
     case SHT4X_LOW_HEATER_1S:
       Serial.println("Low heat for 1 second");
       break;
     case SHT4X_LOW_HEATER_100MS:
       Serial.println("Low heat for 0.1 second");
       break;
  }

}

// WiFi接続処理
void connectToWiFi() {
  WiFi.mode(WIFI_STA); // WIFI_OFFから復帰する場合に備えて明示的にSTAモードへ
  WiFi.begin(ssid, password);
  unsigned long startAttemptTime = millis();

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
    if (millis() - startAttemptTime > 30000) { // タイムアウト30秒
      Serial.println("\nFailed to connect to WiFi. Restarting...");
      ESP.restart();
    }
  }
  Serial.println("\nWiFi connected");

  // ルーターのDNSがうまく機能しない場合があるため、Google Public DNSを明示的に設定
  WiFi.config(WiFi.localIP(), WiFi.gatewayIP(), WiFi.subnetMask(), IPAddress(8, 8, 8, 8), IPAddress(8, 8, 4, 4));
}

// Next.jsのAPIにJSONをPOST（一時的なDNS/接続エラー対策でリトライ）
bool sendReading(float temperature, float humidity) {
  const int maxAttempts = 3;
  bool success = false;

  const char* target = USE_LOCAL_SERVER ? localServerName : prodServerName;
  const char* key = USE_LOCAL_SERVER ? localApiKey : prodApiKey;

  String body = String("{\"device_id\":\"") + deviceId +
                "\",\"temperature\":" + String(temperature, 2) +
                ",\"humidity\":" + String(humidity, 2) + "}";

  for (int attempt = 1; attempt <= maxAttempts && !success; attempt++) {
    HTTPClient http;
    http.setConnectTimeout(15000); // 接続タイムアウトを15秒に延長

    bool began;
    WiFiClientSecure secureClient;
    WiFiClient plainClient;
    if (USE_LOCAL_SERVER) {
      began = http.begin(plainClient, target); // ローカルはhttp（平文）
    } else {
      secureClient.setInsecure(); // 証明書検証をスキップ
      secureClient.setHandshakeTimeout(30); // TLSハンドシェイクのタイムアウトを30秒に延長
      began = http.begin(secureClient, target); // 本番はhttps
    }
    if (!began) {
      Serial.println("http.begin failed");
      continue;
    }
    http.addHeader("Content-Type", "application/json");
    http.addHeader("x-api-key", key);

    int httpResponseCode = http.POST(body);
    if (httpResponseCode > 0 && httpResponseCode < 300) {
      Serial.print("POST succeeded (attempt ");
      Serial.print(attempt);
      Serial.print("), response code: ");
      Serial.println(httpResponseCode);
      success = true;
    } else {
      Serial.print("Error on sending POST (attempt ");
      Serial.print(attempt);
      Serial.print("): ");
      Serial.println(httpResponseCode);
    }
    http.end();

    if (!success && attempt < maxAttempts) {
      delay(2000); // リトライ前に少し待つ
    }
  }

  if (!success) {
    Serial.println("POST failed after all retry attempts.");
  }
  return success;
}

void loop() {
  sensors_event_t humidity, temp;

  // ループの最後でWiFiをOFFにしているので、毎回ここでフレッシュに接続し直す
  Serial.println("Connecting WiFi...");
  connectToWiFi();

  uint32_t timestamp = millis();

  sht4.getEvent(&humidity, &temp); // populate temp and humidity objects with fresh data
  timestamp = millis() - timestamp;

  Serial.print("Temperature: "); Serial.print(temp.temperature); Serial.println(" degrees C");
  Serial.print("Humidity: "); Serial.print(humidity.relative_humidity); Serial.println("% rH");
  M5.Lcd.printf("T:%.1fC H:%.1f%%\r\n", temp.temperature, humidity.relative_humidity);

  Serial.print("Read duration (ms): ");
  Serial.println(timestamp);

  if (WiFi.status() == WL_CONNECTED) {
    sendReading(temp.temperature, humidity.relative_humidity);
  } else {
    Serial.println("WiFi Disconnected");
    connectToWiFi();
  }

  // 送信が終わったのでWiFiを切って、待機中の消費電力を抑える
  Serial.println("Turning off WiFi to save power...");
  WiFi.disconnect(true);
  WiFi.mode(WIFI_OFF);

  delay(SEND_INTERVAL_MS);
}
