# Web ページでスマホから操作する

ここまで nRF Connect というアプリを使って micro:bit に接続してきました。このページでは、nRF Connect の代わりに、自分で書いた HTML ファイルをブラウザで開いて操作できるようにします。アプリのインストールは不要で、HTML ファイル1枚で完結します。

## Web Bluetooth とは

ブラウザには、BLE デバイスに接続するための API が標準で組み込まれています。Web Bluetooth API と呼ばれるもので、JavaScript からサービスやキャラクタリスティックに直接アクセスできます。Android Chrome が対応しています。iOS は 2026年7月時点で未対応です。

ここで扱う操作は、前のページで nRF Connect からやっていたことそのままです。気温の Notify を購読してスマホで表示し、LED コマンドを Write で送る。相手は同じ micro:bit で、UUID も変わりません。変わるのは、スマホ側の操作者が nRF Connect から自分で書いたページになる点だけです。

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

1バイトのデータを Write で送ります。Rust 側の `command: u8` として届き、Write ハンドラが受け取ります。ボタンに設定した `data-cmd` の値（0・1・2）がそのまま Rust 側の `cmd` に渡ります。

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

Web Bluetooth は localhost か https で開いたページでしか動きません。HTML ファイルをダブルクリックして `file://` で開いても接続できないため、ローカルサーバーを使います。Python が入っていれば、プロジェクト直下で次のコマンドを実行してください。

```sh
python3 -m http.server
```

ブラウザで `http://localhost:8000/web/` を開いてください。「接続」ボタンを押すとデバイス選択ダイアログが開き、"micro:bit" を選ぶと接続が始まります。接続が完了すると気温の表示が始まり、ボタンで LED を切り替えられるようになります。

動作確認は PC の Chrome で行うのが手軽です。Android スマホで試すには、PC と Android が同じ Wi-Fi に繋がっている必要があります（または USB デバッグ経由）。

ローカルサーバーを立てなくても試せるよう、サンプルリポジトリの GitHub Pages でも公開されています。

https://shinagawa-web.github.io/rust-guide-sample-intermediate-embedded/web/

---

次のページでは、ここまでをふりかえります。
