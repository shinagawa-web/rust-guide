# Web ページから micro:bit を操作する

ここまで nRF Connect というアプリを使って micro:bit に接続してきました。このページでは、nRF Connect の代わりに、自分で書いた HTML ファイルをブラウザで開いて操作できるようにします。アプリのインストールは不要で、HTML ファイル1枚で完結します。

## Web Bluetooth とは

Web ページ・スマホ（または PC）・micro:bit の関係はこうなっています。

```text
スマホ / PC
┌────────────────────────┐
│  Chrome                │
│  ┌──────────────────┐  │
│  │ index.html (JS)  │  │──── BLE ────▶ micro:bit
│  └──────────────────┘  │
└────────────────────────┘
```

Web ページはスマホ（または PC）のブラウザ上で動きます。JavaScript が Web Bluetooth API を通じて BLE に直接アクセスし、micro:bit と通信します。サーバーは経由しません。

Android Chrome が対応しています。iOS は 2026年7月時点で未対応です。

ここで扱う操作は、前のページで nRF Connect からやっていたことそのままです。気温の Notify を購読して表示し、LED コマンドを Write で送る。相手は同じ micro:bit で、UUID も変わりません。変わるのは、操作する側が nRF Connect から自分で書いたページになる点だけです。

## HTML を作る

プロジェクト直下に `web/index.html` を作ります。

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>micro:bit BLE</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 2rem; line-height: 1.6; }
    #temp { font-size: 3rem; margin: 1rem 0; }
    button { font-size: 1.1rem; padding: 0.6rem 1rem; margin: 0.25rem; }
    #status { color: #666; }
  </style>
</head>
<body>
  <h1>micro:bit BLE</h1>

  <button id="connect">接続</button>
  <p id="status">未接続</p>

  <div id="temp">-- ℃</div>

  <div>
    <button class="cmd" data-cmd="1">ハート</button>
    <button class="cmd" data-cmd="2">スマイル</button>
    <button class="cmd" data-cmd="0">消灯</button>
  </div>

  <script>
    // マイコン側で定義した UUID と合わせる。
    const TEMP_SERVICE = 0x181a;
    const TEMP_CHAR    = 0x2a6e;
    const LED_SERVICE  = 0x1815;
    const LED_CHAR     = 0x2a56;

    const statusEl = document.getElementById("status");
    const tempEl = document.getElementById("temp");
    let ledChar = null;

    document.getElementById("connect").addEventListener("click", async () => {
      try {
        const device = await navigator.bluetooth.requestDevice({
          filters: [{ name: "micro:bit" }],
          optionalServices: [TEMP_SERVICE, LED_SERVICE],
        });
        statusEl.textContent = "接続中...";

        device.addEventListener("gattserverdisconnected", () => {
          statusEl.textContent = "切断されました";
          tempEl.textContent = "-- ℃";
          ledChar = null;
        });

        const server = await device.gatt.connect();

        const tempService = await server.getPrimaryService(TEMP_SERVICE);
        const tempChar = await tempService.getCharacteristic(TEMP_CHAR);
        tempChar.addEventListener("characteristicvaluechanged", (e) => {
          // sint16・0.01℃ 単位。100 で割ると℃になる。
          const raw = e.target.value.getInt16(0, true);
          tempEl.textContent = (raw / 100).toFixed(2) + " ℃";
        });
        await tempChar.startNotifications();

        const ledService = await server.getPrimaryService(LED_SERVICE);
        ledChar = await ledService.getCharacteristic(LED_CHAR);

        statusEl.textContent = "接続済み";
      } catch (err) {
        statusEl.textContent = "エラー: " + err.message;
      }
    });

    for (const btn of document.querySelectorAll(".cmd")) {
      btn.addEventListener("click", async () => {
        if (!ledChar) {
          statusEl.textContent = "先に接続してください";
          return;
        }
        const cmd = Number(btn.dataset.cmd);
        await ledChar.writeValue(Uint8Array.of(cmd));
      });
    }
  </script>
</body>
</html>
```

## Rust 側との対応

### UUID は同じ値

スクリプトの冒頭に並んでいる定数は、Rust 側で宣言したものと同じ UUID です。

```js
const TEMP_SERVICE = 0x181a;  // Rust: uuid = "181a"
const TEMP_CHAR    = 0x2a6e;  // Rust: uuid = "2a6e"
const LED_SERVICE  = 0x1815;  // Rust: uuid = "1815"
const LED_CHAR     = 0x2a56;  // Rust: uuid = "2a56"
```

Rust 側では文字列 `"181a"` と書き、JS 側では16進数 `0x181a` と書きますが、指している値は同じです。ブラウザはこの UUID でサービスを特定します。

### 接続からキャラクタリスティック取得まで

接続は次の順に進みます。

```js
const device = await navigator.bluetooth.requestDevice({ ... });
const server = await device.gatt.connect();
const tempService = await server.getPrimaryService(TEMP_SERVICE);
const tempChar = await tempService.getCharacteristic(TEMP_CHAR);
```

`requestDevice` でデバイス選択ダイアログを表示し、`device.gatt.connect()` で GATT サーバーに接続します。そこから `getPrimaryService` でサービスを、`getCharacteristic` でキャラクタリスティックを取り出します。サービスとキャラクタリスティックという2段の構造は、Rust 側で `gatt_service` と `characteristic` を宣言したものと対応しています。

`requestDevice` の `filters` には `{ name: "micro:bit" }` を指定しています。こうするとデバイス選択ダイアログに "micro:bit" だけが表示されます。`optionalServices` に使うサービスの UUID を列挙しないと、ブラウザがアクセスを拒否するため、両方のサービスを書いておきます。

### Notify の受信

```js
tempChar.addEventListener("characteristicvaluechanged", (e) => {
  const raw = e.target.value.getInt16(0, true);
  tempEl.textContent = (raw / 100).toFixed(2) + " ℃";
});
await tempChar.startNotifications();
```

リスナーを登録してから `startNotifications()` を呼ぶ順序にしています。逆にすると、購読開始直後の最初の Notify を受け取れない場合があります。`startNotifications()` を呼ぶと、micro:bit から Notify が届くたびに `characteristicvaluechanged` イベントが発火します。`getInt16(0, true)` で little-endian の `i16` として読み出します。Rust 側で `i16` に収めた値は 0.01℃ 単位なので、100 で割ると℃になります。

### Write の送信

```js
await ledChar.writeValue(Uint8Array.of(cmd));
```

1バイトのデータを Write で送ります。Rust 側の Write ハンドラが `cmd` として受け取り、`PATTERN` に保存します。`display_task` がそれを読んで表示するパターン（消灯・ハート・スマイル）を切り替えます。

### 切断の検知

```js
device.addEventListener("gattserverdisconnected", () => {
  statusEl.textContent = "切断されました";
  tempEl.textContent = "-- ℃";
  ledChar = null;
});
```

micro:bit との接続が切れると `gattserverdisconnected` イベントが発火します。`ledChar` を `null` に戻しておくことで、切断後に Write ボタンを押しても送信を試みないようにしています。

## 動かし方

Web Bluetooth は `localhost` か `https` で開いたページでしか動きません。HTML ファイルをダブルクリックして `file://` で開いても接続できません。

### PC の Chrome で試す

プロジェクト直下でローカルサーバーを起動してください。

```sh
python3 -m http.server
```

Chrome で `http://localhost:8000/web/` を開いてください。

### Android の Chrome で試す

Android の Chrome から PC のローカルサーバーには直接アクセスできません（`localhost` はスマホ自身を指すため）。GitHub Pages で公開しているページを使うのが最短です。

<https://shinagawa-web.github.io/rust-guide-sample-intermediate-embedded/web/>

Android の Chrome でこの URL を開き、「接続」ボタンを押してください。

[![Image from Gyazo](https://i.gyazo.com/81919a50aad7f01fab7682c4fd6c9e0b.gif)](https://gyazo.com/81919a50aad7f01fab7682c4fd6c9e0b)

USB デバッグを有効にして PC と繋いでいる場合は、次のコマンドで `localhost` を転送できます。

```sh
adb reverse tcp:8000 tcp:8000
```

これを実行すると、Android の Chrome から `http://localhost:8000/web/` でもアクセスできます。

### ページを操作する

ページを開いたら「接続」ボタンを押します。デバイス選択ダイアログが開くので "micro:bit" を選んでください。

接続が完了するとステータスが「接続済み」に変わり、気温の値が表示されます。1 秒ごとに更新されます。

ハート・スマイル・消灯のボタンを押すと micro:bit に Write が送られ、LED の表示が切り替わります。

---

次のページでは、ここまでをふりかえります。
