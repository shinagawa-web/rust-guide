# スマホから micro:bit を見つける

このページを終えると、スマホの nRF Connect を開いたときに "micro:bit" が表示されるようになります。

```text
micro:bit ──── アドバタイズ ────▶ スマホ    スキャンに "micro:bit" が現れる
micro:bit ◀─── 接続 ────────────  スマホ    タップして接続
```

手順が多いページです。SoftDevice という Nordic 製のバイナリを micro:bit に別途書き込む必要があり、プロジェクトの設定も初級編とは大きく異なります。スマホとマイコンを両方手元に置いて進めてください。ここを通り抜ければ、次のページからは BLE の機能をコードで一枚ずつ重ねていきます。

## SoftDevice とは

micro:bit には BLE の通信処理を担うソフトウェアが最初から入っていません。Nordic Semiconductor が SoftDevice という専用バイナリを配布しており、これを先に書き込んでおくと BLE の処理を担います。

普通の組み込みファームウェアでは「アプリだけを書き込む」のが当たり前ですが、SoftDevice はアプリとは別にフラッシュ（プログラムを保存する記憶領域）の先頭に書き込みます。

```text
フラッシュ（プログラム保存領域・512KB）
┌────────────────────┐ 0x00000
│  SoftDevice S140   │ 156KB  ← 別途書き込む（一度だけ）
├────────────────────┤ 0x27000
│  Rust アプリ        │ 356KB  ← cargo run で書き込む
│                    │
└────────────────────┘ 0x80000
```

SoftDevice は起動時に制御を握り、BLE の処理が必要なときに呼ばれます。

## SoftDevice をダウンロードして書き込む

### ダウンロード

Nordic の [S140 ダウンロードページ](https://www.nordicsemi.com/Products/Development-software/s140/download)から S140 v7.3.0 の hex ファイルをダウンロードします。

```text
s140_nrf52_7.3.0_softdevice.hex
```

### 書き込み

probe-rs は USB 経由でファームウェアを書き込む Rust 製のツールです。micro:bit を USB でつないだ状態で次のコマンドを実行します。

```sh
probe-rs download --chip nRF52833_xxAA --binary-format hex s140_nrf52_7.3.0_softdevice.hex
```

SoftDevice の書き込みは一度だけで構いません。Rust アプリを書き直しても SoftDevice は消えません。後で設定する memory.x がアプリの書き込み先を SoftDevice より後ろに固定するためです。

## プロジェクトを設定する

初級編とは依存クレートの構成が大きく異なるため、新しいプロジェクトを作ります。

```sh
cargo new microbit-ble
cd microbit-ble
```

設定ファイルを4つ用意します。

### Cargo.toml

```toml
[package]
name = "microbit-ble"
version = "0.1.0"
edition = "2021"

[dependencies]
nrf-softdevice      = { version = "0.1", features = ["nrf52833", "s140", "ble-peripheral", "ble-gatt-server", "critical-section-impl"] }
nrf-softdevice-s140 = "0.1"
embassy-executor    = { version = "0.7", features = ["arch-cortex-m", "executor-thread"] }
embassy-time        = { version = "0.4", features = ["tick-hz-32_768"] }
embassy-nrf         = { version = "0.3", features = ["nrf52833", "time-driver-rtc1"] }
cortex-m            = { version = "0.7", features = ["inline-asm"] }
cortex-m-rt         = "0.7"
defmt               = "0.3"
defmt-rtt           = "0.4"
panic-probe         = { version = "0.3", features = ["print-defmt"] }
static_cell         = "2"
embassy-futures     = "0.1"

[profile.release]
codegen-units = 1
debug = true
opt-level = "s"
```

`features = [...]` はコンパイル時に有効にするオプション機能を選ぶ仕組みです。`nrf-softdevice` の各フィーチャの意味は次の通りです。

| フィーチャ | 用途 |
|---|---|
| `nrf52833` | 使用チップを指定 |
| `s140` | S140 SoftDevice を使う |
| `ble-peripheral` | ペリフェラル役で BLE 通信に必要 |
| `ble-gatt-server` | GATT サーバー機能（気温・LED のページで使う） |
| `critical-section-impl` | no_std 環境でのクリティカルセクション実装 |

`nrf-softdevice-s140` は S140 の定数・型定義を含む補助クレートで、`nrf-softdevice` と組み合わせて使います。

### memory.x

リンカ（コードをメモリに配置するプログラム）に対して「フラッシュと RAM のどこから使えるか」を伝えるファイルです。SoftDevice がフラッシュの先頭 156KB を使うため、Rust アプリは 0x27000 から始めます。

```text
MEMORY
{
  FLASH : ORIGIN = 0x00027000, LENGTH = 356K
  RAM   : ORIGIN = 0x20006000, LENGTH = 104K
}
```

RAM の開始も通常より後ろにずらしています。SoftDevice が RAM の前半を使うためです。初級編の memory.x とは異なる点に注意してください。

### .cargo/config.toml

ビルドターゲットやリンカへの追加オプションをまとめる設定ファイルです。プロジェクトごとに置くことで、`cargo build` や `cargo run` の動作を固定できます。

```toml
[build]
target = "thumbv7em-none-eabihf"

[env]
DEFMT_LOG = "debug"

[target.thumbv7em-none-eabihf]
rustflags = ["-C", "link-arg=-Tlink.x", "-C", "link-arg=-Tdefmt.x"]
runner = "probe-rs run --chip nRF52833_xxAA"
```

- `target` — ビルド先のアーキテクチャを指定します。`thumbv7em-none-eabihf` は micro:bit の ARM Cortex-M4 に対応する値です。
- `DEFMT_LOG` — defmt（組み込み向けログライブラリ）のログレベルです。`"debug"` にしないとログが出力されません。defmt は RTT（Real-Time Transfer）という仕組みでホスト PC にログを転送します。
- `rustflags` — リンカに渡す追加オプションです。`link.x` はメモリレイアウト（`memory.x`）を読み込むリンカスクリプト、`defmt.x` は defmt のシンボル情報を渡すためのものです。
- `runner` — `cargo run` を使う場合の書き込みコマンドです。このガイドでは `cargo embed` を使うため直接は使いませんが、設定しておいても問題ありません。

### Embed.toml

`cargo embed` の動作を設定するファイルです。

```toml
[default.general]
chip = "nRF52833_xxAA"

[default.reset]
halt_afterwards = false

[default.rtt]
enabled = true
timeout = 5000
```

- `chip` — 書き込み先のチップを指定します。micro:bit v2 に搭載されている nRF52833 の型番です。
- `halt_afterwards` — 書き込み後にチップを停止させるかどうかです。`false` にすると書き込み直後にプログラムが動き始めます。
- `rtt.enabled` — RTT ログをターミナルに表示するかどうかです。`true` にすると `defmt::info!()` の出力がそのまま画面に流れます。
- `rtt.timeout` — RTT の接続を待つ時間（ミリ秒）です。起動に時間がかかる場合に備えて余裕を持たせています。

## スマホのスキャンに現れるコードを書く

ペリフェラルは接続を待つ間、自分の存在を定期的に電波で発信しています。この発信をアドバタイズと呼びます。スマホが近くをスキャンすると、アドバタイズを受け取って端末一覧に "micro:bit" が表示されます。

`src/main.rs` を次のように書きます。このページでは「スマホに見つけてもらえる状態」まで確認します。気温の送信と LED 操作は次のページ以降で追加します。

```rust
#![no_std]
#![no_main]

use embassy_executor::Spawner;
use embassy_nrf::interrupt::Priority;
use nrf_softdevice::ble::{
    advertisement_builder::{Flag, LegacyAdvertisementBuilder, LegacyAdvertisementPayload},
    peripheral,
};
use nrf_softdevice::{raw, Softdevice};
use defmt_rtt as _;
use panic_probe as _;

// スキャンに見える名前 "micro:bit" をパケットに詰める
static ADV_DATA: LegacyAdvertisementPayload = LegacyAdvertisementBuilder::new()
    .flags(&[Flag::GeneralDiscovery, Flag::LE_Only])
    .full_name("micro:bit")
    .build();

static SCAN_DATA: LegacyAdvertisementPayload = LegacyAdvertisementBuilder::new().build();

// SoftDevice のイベントループ。別タスクで常時動かしておく
#[embassy_executor::task]
async fn softdevice_task(sd: &'static Softdevice) -> ! {
    sd.run().await
}

#[embassy_executor::main]
async fn main(spawner: Spawner) {
    // embassy-nrf の初期化。必ず Softdevice::enable より先に呼ぶ
    // SoftDevice が割り込み P0・P1・P4 を使うため、アプリ側は P2 以下にする
    let mut nrf_config = embassy_nrf::config::Config::default();
    nrf_config.time_interrupt_priority = Priority::P2;
    let _p = embassy_nrf::init(nrf_config);

    // SoftDevice の設定。このブロックはほぼ定型
    // gap_device_name だけ注目 — 接続後にスマホに見える名前を設定する
    let config = nrf_softdevice::Config {
        clock: Some(raw::nrf_clock_lf_cfg_t {
            source: raw::NRF_CLOCK_LF_SRC_RC as u8,
            rc_ctiv: 16,
            rc_temp_ctiv: 2,
            accuracy: raw::NRF_CLOCK_LF_ACCURACY_500_PPM as u8,
        }),
        conn_gap: Some(raw::ble_gap_conn_cfg_t {
            conn_count: 1,  // 同時に接続できる台数
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
            p_value: b"micro:bit" as *const u8 as _,  // 接続後に見える名前
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
    spawner.spawn(softdevice_task(sd)).unwrap();

    loop {
        // アドバタイズを開始して接続を待つ
        let adv = peripheral::ConnectableAdvertisement::ScannableUndirected {
            adv_data: &ADV_DATA,
            scan_data: &SCAN_DATA,
        };
        let _conn = peripheral::advertise_connectable(sd, adv, &peripheral::Config::default())
            .await
            .unwrap();
        defmt::info!("connected");
        // 接続が切れると loop の先頭に戻り、再びアドバタイズを始める
    }
}
```

コードは4つのブロックで構成されています。

### embassy-nrf の初期化

```rust
let mut nrf_config = embassy_nrf::config::Config::default();
nrf_config.time_interrupt_priority = Priority::P2;
let _p = embassy_nrf::init(nrf_config);
```

SoftDevice を有効にする前に embassy-nrf を初期化しています。SoftDevice は割り込み優先度 P0・P1・P4 を BLE 処理のために占有するため、アプリのタイマが同じ優先度を使うと衝突します。`time_interrupt_priority = Priority::P2` で安全な優先度に下げてから渡すことで衝突を避けています。`embassy_nrf::init()` を `Softdevice::enable` より後に呼ぶと RTC1 タイマドライバが起動せず、次のページで Notify ループが止まります。

### SoftDevice の設定

```rust
let config = nrf_softdevice::Config {
    // ...
    gap_device_name: Some(raw::ble_gap_cfg_device_name_t {
        p_value: b"micro:bit" as *const u8 as _,
        // ...
    }),
    ..Default::default()
};
```

このブロックは定型です。注目するのは `gap_device_name` だけで、接続後にスマホの画面に表示されるデバイス名を設定しています。他のフィールドは接続数や通信パケットのサイズ上限で、ここでは変更不要です。

### SoftDevice の起動

```rust
let sd = Softdevice::enable(&config);
spawner.spawn(softdevice_task(sd)).unwrap();
```

`Softdevice::enable` で SoftDevice を有効化したあと、`softdevice_task` を別タスクとして起動しています。このタスクは BLE のイベント処理ループで、BLE が動くには常に動き続けている必要があります。`spawner.spawn(...)` は非同期タスクを起動する embassy の仕組みで、`spawner` は `main` の引数から受け取ります。

### アドバタイズと接続待ち

```rust
loop {
    let _conn = peripheral::advertise_connectable(sd, adv, &peripheral::Config::default())
        .await
        .unwrap();
    defmt::info!("connected");
}
```

`advertise_connectable` を呼んでアドバタイズを開始し、スマホが接続してくるまで `.await` で待ちます。接続が成立すると `_conn` に接続情報が入り、ログを出したあと次のループに入ります。`_conn` がスコープを抜けて破棄されると接続が切断されるため、ループ先頭に戻って再びアドバタイズを始めます。

## ビルドして書き込む

```sh
cargo embed
```

ビルド・書き込み・実行をまとめて行います。RTT ログが流れ始めれば書き込み成功です。

## nRF Connect で確認する

Android スマホに nRF Connect をインストールしてスキャンします。スキャンを開始すると "micro:bit" が表示されます。

タップして接続してみてください。接続が成立すると RTT ログに次のように出ます。

```text
INFO  connected
```

接続後すぐ切断されても問題ありません。loop に戻って再びアドバタイズを始めます。

### うまく動かないとき

"micro:bit" がスキャンに出てこない場合は SoftDevice の書き込みを確認してください。`probe-rs download` コマンドをもう一度実行して構いません。すでに書き込まれていても上書きされるだけです。

RTT ログが出ない場合は `.cargo/config.toml` に `DEFMT_LOG = "debug"` があるか確認してください。

コードのビルドエラーが出る場合は[サンプルリポジトリ](https://github.com/shinagawa-web/rust-guide-sample-intermediate-embedded)の `src/main.rs` と見比べてください。

---

スマホから micro:bit を見つけられました。次のページでは気温センサの値を Notify で送ります。
