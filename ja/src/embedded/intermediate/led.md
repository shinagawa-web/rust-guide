# スマホから LED を操作する

このページを終えると、スマホからコマンドを送って micro:bit の LED を動かせるようになります。

前のページまではマイコンがスマホへ値を送る一方通行でした。ここで「スマホ→マイコン」方向の通信を加えます。スマホからコマンドを送ると、マイコン側がそれを受け取って LED の表示を切り替えます。

## LED サービスを宣言する

新たに LED 操作用のサービスを追加します。

```rust
#[nrf_softdevice::gatt_service(uuid = "1815")]
struct LedService {
    #[characteristic(uuid = "2a56", write)]
    command: u8,
}

#[nrf_softdevice::gatt_server]
struct Server {
    temperature: TemperatureService,
    led: LedService,
}
```

UUID `1815` は Bluetooth の仕様で「Automation IO」に割り当てられた標準 ID です。`2a56` は「Digital」キャラクタリスティックです。アトリビュートに `write` を指定することで、スマホからこのキャラクタリスティックに値を書き込めるようになります。

`Server` には既存の `temperature` フィールドに加えて `led: LedService` を追加します。マクロが生成する `ServerEvent` と `LedServiceEvent` という列挙型を使って、Write イベントをパターンマッチで受け取ります。

## インポートの追加

LED ピンを操作するために、GPIO 関連のインポートを加えます。

```rust
use embassy_nrf::gpio::{Level, Output, OutputDrive};
use core::sync::atomic::AtomicU8;
```

`AtomicBool` は前のページで追加済みです。`AtomicU8` は同じ `core::sync::atomic` にあるので、`use` 文をまとめて書き直してください。

## 表示パターンを共有する

Write ハンドラと LED 表示タスクは別々に動くため、どのパターンを表示するかを `static` な共有変数で伝えます。

```rust
static PATTERN: AtomicU8 = AtomicU8::new(0);
```

値の意味は次の通りです。

- 0: 消灯
- 1: ハート
- 2: スマイル

Write ハンドラがここに書き込み、表示タスクが読み取ります。`AtomicU8` を使う理由は、2つの独立したタスクが同じ値を読み書きするためです。Mutex を使わず整数の原子的な読み書きだけで十分なケースでは、`AtomicU8` のほうがシンプルに書けます。

## 表示パターンを定義する

LED マトリクスに描く3種類のパターンを定数として定義します。

```rust
const HEART: [[u8; 5]; 5] = [
    [0, 1, 0, 1, 0],
    [1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1],
    [0, 1, 1, 1, 0],
    [0, 0, 1, 0, 0],
];
const SMILEY: [[u8; 5]; 5] = [
    [0, 0, 0, 0, 0],
    [0, 1, 0, 1, 0],
    [0, 0, 0, 0, 0],
    [1, 0, 0, 0, 1],
    [0, 1, 1, 1, 0],
];
const BLANK: [[u8; 5]; 5] = [[0; 5]; 5];
```

`1` が点灯する LED、`0` が消灯です。5×5 の配列の各要素が LED 1個に対応します。

## LED マトリクスの点灯原理

micro:bit v2 の LED は 5×5 のマトリクス回路です。行（row）と列（col）の組み合わせで1個の LED を指定します。row を High、対応する col を Low にすると、その交点の LED が光ります。

一度に1行しか点けられないため、1行ずつ順番に点けて 2ms ごとに切り替えます。人間の目には切り替えが見えないため、全体が光っているように見えます（残像効果）。

## 常時点灯を別タスクに分ける

この走査ループは BLE の処理とは独立して常時動かす必要があります。`embassy_executor::task` として分離します。

```rust
#[embassy_executor::task]
async fn display_task(mut rows: [Output<'static>; 5], mut cols: [Output<'static>; 5]) {
    loop {
        let image = match PATTERN.load(Ordering::Relaxed) {
            1 => &HEART,
            2 => &SMILEY,
            _ => &BLANK,
        };
        for r in 0..5 {
            for c in 0..5 {
                if image[r][c] != 0 {
                    cols[c].set_low();
                } else {
                    cols[c].set_high();
                }
            }
            rows[r].set_high();
            Timer::after_millis(2).await;
            rows[r].set_low();
            for c in 0..5 {
                cols[c].set_high();
            }
        }
    }
}
```

ループのたびに `PATTERN` を読み、対応するパターンの配列を選びます。内側のループで各 col の High/Low を設定してから、行を High にして 2ms 待ち、行を戻して col をリセットします。

## GPIO ピンの初期化と display_task の起動

`embassy_nrf::init` の直後に GPIO ピンを初期化して `display_task` を起動します。

前のページでは GPIO を使わなかったため `let _p = embassy_nrf::init(nrf_config)` と書いていました。このページでは GPIO ピンにアクセスするために、`_p` から `p` に変えます。

```rust
// 変更前
let _p = embassy_nrf::init(nrf_config);

// 変更後
let p = embassy_nrf::init(nrf_config);
```

続けて rows と cols を初期化し、タスクを起動します。

```rust
let rows = [
    Output::new(p.P0_21, Level::Low, OutputDrive::Standard),
    Output::new(p.P0_22, Level::Low, OutputDrive::Standard),
    Output::new(p.P0_15, Level::Low, OutputDrive::Standard),
    Output::new(p.P0_24, Level::Low, OutputDrive::Standard),
    Output::new(p.P0_19, Level::Low, OutputDrive::Standard),
];
let cols = [
    Output::new(p.P0_28, Level::High, OutputDrive::Standard),
    Output::new(p.P0_11, Level::High, OutputDrive::Standard),
    Output::new(p.P0_31, Level::High, OutputDrive::Standard),
    Output::new(p.P1_05, Level::High, OutputDrive::Standard),
    Output::new(p.P0_30, Level::High, OutputDrive::Standard),
];
spawner.spawn(display_task(rows, cols)).unwrap();
```

rows は初期値 `Level::Low`（行は最初は電流を流さない）、cols は `Level::High`（列は最初は全部オフ）で初期化します。

## Write ハンドラを追加する

`gatt_server::run` のクロージャに `ServerEvent::Led` のアームを追加します。

```rust
gatt_server::run(&conn, &server, |event| match event {
    ServerEvent::Temperature(TemperatureServiceEvent::TemperatureCccdWrite {
        notifications,
    }) => {
        notify_enabled.store(notifications, Ordering::Relaxed);
    }
    // 追加
    ServerEvent::Led(LedServiceEvent::CommandWrite(cmd)) => {
        defmt::info!("command write: {}", cmd);
        PATTERN.store(cmd, Ordering::Relaxed);
    }
})
```

スマホから Write が届くと `LedServiceEvent::CommandWrite(cmd)` に `u8` の値が入って届きます。それを `PATTERN` に保存するだけです。GPIO の操作は `display_task` が担うため、このハンドラは保存のみに留めます。

ハンドラのクロージャは非同期ではなく、`await` を呼べません。そのため GPIO をここで直接操作しようとしても、点灯の待機ループを回すことができません。Write で値を受け取り、表示は別タスクに任せるという分業が必要な理由はここにあります。

## 完成後の main.rs

差分を全部反映したコードです。

```rust
#![no_std]
#![no_main]

use core::sync::atomic::{AtomicBool, AtomicU8, Ordering};
use embassy_executor::Spawner;
use embassy_nrf::gpio::{Level, Output, OutputDrive};
use embassy_nrf::interrupt::Priority;
use embassy_time::Timer;
use nrf_softdevice::ble::{
    advertisement_builder::{Flag, LegacyAdvertisementBuilder, LegacyAdvertisementPayload},
    gatt_server, peripheral,
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

#[nrf_softdevice::gatt_service(uuid = "1815")]
struct LedService {
    #[characteristic(uuid = "2a56", write)]
    command: u8,
}

#[nrf_softdevice::gatt_server]
struct Server {
    temperature: TemperatureService,
    led: LedService,
}

static PATTERN: AtomicU8 = AtomicU8::new(0);

const HEART: [[u8; 5]; 5] = [
    [0, 1, 0, 1, 0],
    [1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1],
    [0, 1, 1, 1, 0],
    [0, 0, 1, 0, 0],
];
const SMILEY: [[u8; 5]; 5] = [
    [0, 0, 0, 0, 0],
    [0, 1, 0, 1, 0],
    [0, 0, 0, 0, 0],
    [1, 0, 0, 0, 1],
    [0, 1, 1, 1, 0],
];
const BLANK: [[u8; 5]; 5] = [[0; 5]; 5];

#[embassy_executor::task]
async fn display_task(mut rows: [Output<'static>; 5], mut cols: [Output<'static>; 5]) {
    loop {
        let image = match PATTERN.load(Ordering::Relaxed) {
            1 => &HEART,
            2 => &SMILEY,
            _ => &BLANK,
        };
        for r in 0..5 {
            for c in 0..5 {
                if image[r][c] != 0 {
                    cols[c].set_low();
                } else {
                    cols[c].set_high();
                }
            }
            rows[r].set_high();
            Timer::after_millis(2).await;
            rows[r].set_low();
            for c in 0..5 {
                cols[c].set_high();
            }
        }
    }
}

#[embassy_executor::task]
async fn softdevice_task(sd: &'static Softdevice) -> ! {
    sd.run().await
}

#[embassy_executor::main]
async fn main(spawner: Spawner) {
    let mut nrf_config = embassy_nrf::config::Config::default();
    nrf_config.time_interrupt_priority = Priority::P2;
    let p = embassy_nrf::init(nrf_config);

    let rows = [
        Output::new(p.P0_21, Level::Low, OutputDrive::Standard),
        Output::new(p.P0_22, Level::Low, OutputDrive::Standard),
        Output::new(p.P0_15, Level::Low, OutputDrive::Standard),
        Output::new(p.P0_24, Level::Low, OutputDrive::Standard),
        Output::new(p.P0_19, Level::Low, OutputDrive::Standard),
    ];
    let cols = [
        Output::new(p.P0_28, Level::High, OutputDrive::Standard),
        Output::new(p.P0_11, Level::High, OutputDrive::Standard),
        Output::new(p.P0_31, Level::High, OutputDrive::Standard),
        Output::new(p.P1_05, Level::High, OutputDrive::Standard),
        Output::new(p.P0_30, Level::High, OutputDrive::Standard),
    ];
    spawner.spawn(display_task(rows, cols)).unwrap();

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
                ServerEvent::Led(LedServiceEvent::CommandWrite(cmd)) => {
                    defmt::info!("command write: {}", cmd);
                    PATTERN.store(cmd, Ordering::Relaxed);
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

RTT ログに `connected` が流れたら nRF Connect で LED サービス（UUID: 1815）を開きます。`command` キャラクタリスティック（UUID: 2a56）の Write ボタンをタップし、値を16進数で入力してください。

- `01` → ハートが表示される
- `02` → スマイルが表示される
- `00` → 消灯する

RTT ログには `command write: 1` のように届いた値が流れます。値が届いているのに LED が変わらない場合は、GPIO の初期化より先に `display_task` が起動できているか確認してください。

---

次のページでは、この動作をブラウザから操作できる Web ページを作ります。
