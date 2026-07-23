# 気温をスマホに届ける

このページを終えると、nRF Connect で micro:bit に接続したとき、気温の値が1秒ごとに届くようになります。

前のページのコードでは「接続が来たら INFO ログを出して終わる」だけでした。ここでは接続中にチップ内蔵の温度センサを読み続け、Notify でスマホへ送る仕組みを加えます。

## サービスをコードで宣言する

BLE では「どんなデータを持っているか」をサービスとキャラクタリスティックという構造で表現します（UUID で識別される機能のまとまりがサービス、実際の値がキャラクタリスティックです）。これを nrf-softdevice のマクロで宣言します。

```rust
#[nrf_softdevice::gatt_service(uuid = "181a")]
struct TemperatureService {
    #[characteristic(uuid = "2a6e", read, notify)]
    temperature: i16,
}

#[nrf_softdevice::gatt_server]
struct Server {
    temperature: TemperatureService,
}
```

`gatt_service` はアトリビュートマクロで、UUID を持つ BLE サービスの実装を生成します。UUID `181a` は Bluetooth の仕様で「Environmental Sensing」に割り当てられた標準 ID です。

`characteristic` はキャラクタリスティックを定義します。

- `uuid = "2a6e"` — 「Temperature」キャラクタリスティックの標準 ID です。スマホのアプリはこの ID を見て「気温の値だ」と判断します。
- `read` — スマホから現在値を読み出せる操作を有効にします。
- `notify` — micro:bit からスマホへ値を送りつける操作を有効にします。

`temperature: i16` とフィールドに書くと、マクロがそのキャラクタリスティックの値の型を `i16`（符号付き16ビット整数）として扱います。

`gatt_server` は複数のサービスをまとめるサーバー構造体を生成します。同時に `ServerEvent` という列挙型も生成されます。接続中に届くイベント（CCCD の書き込みなど）をパターンマッチで受け取るときに使います。同様に `gatt_service` マクロは `TemperatureServiceEvent` という列挙型を生成します。これらの名前はマクロが自動でつけるため、自分で定義する必要はありません。

サーバー構造体は `main` の前に書きます。前のページの `main.rs` に次の2ブロックを追加してください（`static ADV_DATA` の宣言より前であれば構いません）。

## インポートと差分の全体像

前のページの `use` 文に次を追加します。

```rust
use core::sync::atomic::{AtomicBool, Ordering};
use embassy_time::Timer;
use nrf_softdevice::temperature_celsius;
```

また、`static ADV_DATA` の前に次の行を追加します。

```rust
defmt::timestamp!("{=u32}", 0u32);
```

defmt のログには本来タイムスタンプが付きます。このマクロで固定値 `0` を返すよう上書きすることで、RTT ログの出力形式を `0 INFO connected` のように安定させています。

既存の `nrf_softdevice::ble` の `use` 文に `gatt_server` を追加します。

```rust
// 変更前
use nrf_softdevice::ble::{
    advertisement_builder::{Flag, LegacyAdvertisementBuilder, LegacyAdvertisementPayload},
    peripheral,
};

// 変更後
use nrf_softdevice::ble::{
    advertisement_builder::{Flag, LegacyAdvertisementBuilder, LegacyAdvertisementPayload},
    gatt_server,
    peripheral,
};
```

`main` 内では `let _conn` を `let conn` に変えます。前のページでは接続情報を使わないため `_conn` と書いていましたが、このページでは Notify の送信先として `&conn` を渡すために名前が必要になります。

```rust
// 変更前
let _conn = peripheral::advertise_connectable(sd, adv, &peripheral::Config::default())
    .await
    .unwrap();

// 変更後
let conn = peripheral::advertise_connectable(sd, adv, &peripheral::Config::default())
    .await
    .unwrap();
```

`Softdevice::enable` の直後に `Server::new(sd)` を追加します。

```rust
let sd = Softdevice::enable(&config);
let server = Server::new(sd).unwrap();
spawner.spawn(softdevice_task(sd)).unwrap();
```

## スマホが「受け取る」と宣言するまで送らない

Notify は電波の帯域を消費します。スマホが必要としていない Notify を送り続けると、実際のアプリでは電力と帯域を無駄に使います。

BLE にはこれを避ける仕組みが用意されています。CCCD（Client Characteristic Configuration Descriptor）と呼ばれるしくみで、スマホがキャラクタリスティックに対して「通知を受け取りたい」と書き込むと Notify が有効になります。接続するだけでは有効にならず、スマホが明示的にサブスクライブして初めて動きます。

コードでは `AtomicBool` でこの状態を管理します。2つの非同期処理が同じフラグを読み書きするため、`AtomicBool` を使います。

```rust
let notify_enabled = AtomicBool::new(false);
```

接続が来るたびに `false` で初期化し、スマホが CCCD を書き込んだときに `true` に切り替えます。

## 気温を読んで送るループ

実際に気温を読んで通知するタスクは、こう書きます。

```rust
let notify_task = async {
    loop {
        if notify_enabled.load(Ordering::Relaxed) {
            let raw_temp = temperature_celsius(sd).unwrap();
            // チップ温度は 0.25℃ 刻み。BLE の Temperature(2a6e) は 0.01℃ 単位なので
            // 25 倍して換算する（例: 26.00℃ → 2600）
            let temp: i16 = (raw_temp.to_bits() * 25) as i16;
            defmt::info!("notify temp={}", temp);
            let _ = server.temperature.temperature_set(&temp);
            if server.temperature.temperature_notify(&conn, &temp).is_err() {
                defmt::warn!("notify failed");
            }
            Timer::after_secs(1).await;
        } else {
            // CCCD 有効化待ち
            Timer::after_millis(50).await;
        }
    }
};
```

`temperature_celsius` は nrf-softdevice が提供する関数で、チップに内蔵された温度センサを読み取ります。戻り値の型は `I30F2` という固定小数点数型です。`to_bits()` を呼ぶと、0.25℃を1単位とした整数に変換されます。

BLE の Temperature キャラクタリスティック（UUID: 2a6e）は 0.01℃ を1単位とする整数で値を表します。0.25℃ は 0.01℃ の 25 倍なので、`to_bits()` の値に 25 をかけることで単位を揃えます。26.00℃ なら 104 × 25 = 2600、つまり「2600 × 0.01℃ = 26.00℃」という表現です。

`temperature_set` を先に呼んでおくと、スマホが Read で現在値を問い合わせたときにも正しい値が返ります。`temperature_notify` が実際の Notify 送信で、`&conn` で対象の接続を指定します。

動作確認は、micro:bit を手で包んで温めてみてください。値が上がれば、センサが正しく読めています。チップ自体の発熱を拾うため、室温より1〜2度ほど高めに出ます。

## BLE イベントと Notify を並行して動かす

Notify を送るタスクと、スマホからの BLE イベントを受け取るループは、同時に動かす必要があります。接続中は両方が走っていなければいけません。

`embassy_futures::select::select` を使います。

```rust
embassy_futures::select::select(
    gatt_server::run(&conn, &server, |event| match event {
        ServerEvent::Temperature(TemperatureServiceEvent::TemperatureCccdWrite {
            notifications,
        }) => {
            notify_enabled.store(notifications, Ordering::Relaxed);
        }
    }),
    notify_task,
)
.await;
```

`select` は2つの非同期処理を並行して実行します。切断が起きると `gatt_server::run` が完了し、`select` が戻ります。

`gatt_server::run` は接続が続く間 BLE イベントを受け取り続けるループです。スマホが CCCD に書き込むと `TemperatureCccdWrite` イベントが届き、`notifications` フラグが `true` になります。それを `notify_enabled` に保存することで、別の非同期処理として動いている `notify_task` がフラグを見て Notify を送り始めます。

`TemperatureServiceEvent` は `gatt_service` マクロが生成した列挙型です。`TemperatureCccdWrite` はその中のバリアントで、CCCD が書き込まれたことを表します。`ServerEvent` は `gatt_server` マクロが生成した列挙型で、`Temperature` バリアントにラップされて届きます。

`select` が返ったあとに `defmt::info!("disconnected")` を書いておくと、切断のタイミングをログで確認できます。ループ先頭に戻ると再びアドバタイズを始めます。

## 完成後の main.rs

差分を全部反映したコードです。

```rust
#![no_std]
#![no_main]

use core::sync::atomic::{AtomicBool, Ordering};
use embassy_executor::Spawner;
use embassy_nrf::interrupt::Priority;
use embassy_time::Timer;
use nrf_softdevice::ble::{
    advertisement_builder::{Flag, LegacyAdvertisementBuilder, LegacyAdvertisementPayload},
    gatt_server,
    peripheral,
};
use nrf_softdevice::{raw, temperature_celsius, Softdevice};
use defmt_rtt as _;
use panic_probe as _;

defmt::timestamp!("{=u32}", 0u32);

static ADV_DATA: LegacyAdvertisementPayload = LegacyAdvertisementBuilder::new()
    .flags(&[Flag::GeneralDiscovery, Flag::LE_Only])
    .full_name("micro:bit")
    .build();

static SCAN_DATA: LegacyAdvertisementPayload = LegacyAdvertisementBuilder::new().build();

#[nrf_softdevice::gatt_service(uuid = "181a")]
struct TemperatureService {
    #[characteristic(uuid = "2a6e", read, notify)]
    temperature: i16,
}

#[nrf_softdevice::gatt_server]
struct Server {
    temperature: TemperatureService,
}

#[embassy_executor::task]
async fn softdevice_task(sd: &'static Softdevice) -> ! {
    sd.run().await
}

#[embassy_executor::main]
async fn main(spawner: Spawner) {
    let mut nrf_config = embassy_nrf::config::Config::default();
    nrf_config.time_interrupt_priority = Priority::P2;
    let _p = embassy_nrf::init(nrf_config);

    let config = nrf_softdevice::Config {
        clock: Some(raw::nrf_clock_lf_cfg_t {
            source: raw::NRF_CLOCK_LF_SRC_RC as u8,
            rc_ctiv: 16,
            rc_temp_ctiv: 2,
            accuracy: raw::NRF_CLOCK_LF_ACCURACY_500_PPM as u8,
        }),
        conn_gap: Some(raw::ble_gap_conn_cfg_t {
            conn_count: 1,
            event_length: 24,
        }),
        conn_gatt: Some(raw::ble_gatt_conn_cfg_t { att_mtu: 256 }),
        gatts_attr_tab_size: Some(raw::ble_gatts_cfg_attr_tab_size_t {
            attr_tab_size: raw::BLE_GATTS_ATTR_TAB_SIZE_DEFAULT,
        }),
        gap_role_count: Some(raw::ble_gap_cfg_role_count_t {
            adv_set_count: 1,
            periph_role_count: 1,
            central_role_count: 0,
            central_sec_count: 0,
            _bitfield_1: raw::ble_gap_cfg_role_count_t::new_bitfield_1(0),
        }),
        gap_device_name: Some(raw::ble_gap_cfg_device_name_t {
            p_value: b"micro:bit" as *const u8 as _,
            current_len: 9,
            max_len: 9,
            write_perm: unsafe { core::mem::zeroed() },
            _bitfield_1: raw::ble_gap_cfg_device_name_t::new_bitfield_1(
                raw::BLE_GATTS_VLOC_STACK as u8,
            ),
        }),
        ..Default::default()
    };

    let sd = Softdevice::enable(&config);
    let server = Server::new(sd).unwrap();
    spawner.spawn(softdevice_task(sd)).unwrap();

    loop {
        let adv = peripheral::ConnectableAdvertisement::ScannableUndirected {
            adv_data: &ADV_DATA,
            scan_data: &SCAN_DATA,
        };
        let conn = peripheral::advertise_connectable(sd, adv, &peripheral::Config::default())
            .await
            .unwrap();
        defmt::info!("connected");

        let notify_enabled = AtomicBool::new(false);

        let notify_task = async {
            loop {
                if notify_enabled.load(Ordering::Relaxed) {
                    let raw_temp = temperature_celsius(sd).unwrap();
                    // チップ温度は 0.25℃ 刻み。BLE の Temperature(2a6e) は 0.01℃ 単位なので
                    // 25 倍して換算する（例: 26.00℃ → 2600）
                    let temp: i16 = (raw_temp.to_bits() * 25) as i16;
                    defmt::info!("notify temp={}", temp);
                    let _ = server.temperature.temperature_set(&temp);
                    if server.temperature.temperature_notify(&conn, &temp).is_err() {
                        defmt::warn!("notify failed");
                    }
                    Timer::after_secs(1).await;
                } else {
                    Timer::after_millis(50).await;
                }
            }
        };

        embassy_futures::select::select(
            gatt_server::run(&conn, &server, |event| match event {
                ServerEvent::Temperature(TemperatureServiceEvent::TemperatureCccdWrite {
                    notifications,
                }) => {
                    notify_enabled.store(notifications, Ordering::Relaxed);
                }
            }),
            notify_task,
        )
        .await;

        defmt::info!("disconnected");
    }
}
```

## ビルドして動作を確認する

```sh
cargo embed
```

RTT ログに `connected` が流れたら nRF Connect でキャラクタリスティックを開き、通知の購読ボタン（下向き矢印のアイコン）をタップしてください。CCCD が有効になると、1秒ごとに値が届きます。

値の読み方は次の通りです。2600 と表示されていれば 26.00℃（2600 × 0.01℃）です。動作確認は、micro:bit を手で包んで温めてみてください。値が上がれば、センサが正しく読めています。チップ自体の発熱がある分、室温より1〜2度ほど高い値が届きます。

次のページで `Server` に LED サービスを追加すると、`gatt_server::run` のクロージャに `ServerEvent::Led(...)` アームを足す必要があります。

---

次のページでは、スマホから micro:bit の LED を操作します。
