# AtomS3 + ENV.IV 環境モニター

M5Stack AtomS3 と ENV.IV ユニット（SHT40 温湿度センサー）から送信される気温・湿度データを
受信・保存・可視化する Next.js アプリです。

- **受信**: `POST /api/readings` に AtomS3 から JSON を送信（`x-api-key` ヘッダーで認証）
- **保存**: SQLite（better-sqlite3）にローカルファイルとして保存
- **表示**: 最新値のスタットタイルと、気温・湿度の推移グラフ（10秒ごとに自動更新）

## セットアップ

```bash
npm install
cp .env.example .env.local
```

`.env.local` を編集し、`API_KEY` に任意のランダムな文字列を設定してください（AtomS3 側にも同じ値を設定します）。

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) を開くとダッシュボードが表示されます。

> **AtomS3など、同じLAN内の別端末（スマホ等）から確認する場合は `npm run dev` ではなく
> 本番ビルドを使ってください。** 開発モードのHMR（ホットリロード）まわりの処理が
> LAN経由アクセスと干渉し、画面が更新されないことがあります。
>
> ```bash
> npm run build
> npm run start
> ```
>
> コードを変更した際は `npm run build` を再実行してください（ホットリロードは効きません）。
> Railway本番も `next start` で動くため、こちらの方が本番環境に近い確認になります。

### API

| メソッド | パス | 説明 |
|---|---|---|
| POST | `/api/readings` | 1件のデータを登録。ヘッダー `x-api-key: <API_KEY>` が必須 |
| GET | `/api/readings?limit=200` | 直近 N 件のデータを新しい順→古い順に整形して返す |

POST のボディ例:

```json
{ "device_id": "atoms3-01", "temperature": 25.3, "humidity": 55.1 }
```

動作確認:

```bash
curl -X POST http://localhost:3000/api/readings \
  -H "Content-Type: application/json" \
  -H "x-api-key: <API_KEY>" \
  -d '{"temperature":25.3,"humidity":55.1,"device_id":"atoms3-01"}'
```

## Railway へのデプロイ

SQLite ファイルを永続化するため、**ボリューム**を必ずアタッチしてください。

1. Railway で新規プロジェクトを作成し、このリポジトリを接続
2. Settings → Volumes で、例えば `/data` にボリュームをマウント
3. Variables に以下を設定
   - `API_KEY`: ランダムな秘密文字列
   - `DB_PATH`: `/data/app.db`（ボリュームのマウントパス配下）
4. デプロイ後、AtomS3 のファームウェアに Railway が発行した URL（例: `https://xxxx.up.railway.app/api/readings`）を設定

ボリュームをマウントしないと、再デプロイ・再起動のたびにデータが失われるので注意してください。

## AtomS3 + ENV.IV 側のファームウェア（Arduino）

`firmware/NextJs.ino` を Arduino IDE で開いて書き込みます（実機のスケッチは
`C:\Users\j10931\Documents\Arduino\NextJs\NextJs.ino` にあり、Wi-Fi情報やAPIキーなど
実際の値が入っています。リポジトリにコミットされている `firmware/` 配下はプレースホルダに
置き換えてあるので、書き込み前に自分の環境の値へ書き換えてください）。

ポート転送用の `firmware/wsl-port-forward.ps1` は、WSL2環境でローカル確認する場合のみ必要です。

使用ライブラリ（Arduino IDE のライブラリマネージャーからインストール）:

- `M5AtomS3`
- `Adafruit SHT4x Library`（ENV.IV ユニットの SHT40 温湿度センサー用）

書き込み前に、スケッチ冒頭の以下の値を実際の値に置き換えてください。

```cpp
const char* ssid = "...";       // Wi-FiのSSID
const char* password = "...";   // Wi-Fiのパスワード
const char* serverName = "https://xxxx.up.railway.app/api/readings"; // RailwayのデプロイURL
const char* apiKey = "...";     // サーバーの .env の API_KEY と同じ値
const char* deviceId = "atoms3-01";
```

動作:

1. Wi-Fi接続 → SHT40からの気温・湿度を読み取り → 画面(M5.Lcd)に表示
2. `POST /api/readings` にJSON (`{"device_id","temperature","humidity"}`) を送信（最大3回リトライ）
3. 消費電力を抑えるためWi-Fiをオフにして `SEND_INTERVAL_MS`（既定1時間）だけ待機し、ループの先頭に戻る

ダッシュボードをもっと頻繁に更新したい場合は、スケッチ内の `SEND_INTERVAL_MS` を短くしてください。

配線: ENV.IV ユニットは AtomS3 の PORT.A（Grove コネクタ）にそのまま接続できます。

## 技術スタック

- Next.js (App Router) / TypeScript / Tailwind CSS
- better-sqlite3（Railway のボリュームにファイルとして永続化）
- recharts（推移グラフ表示）
