# スマホから micro:bit を見つける

この章を終えると、スマホの nRF Connect を開いたときに "micro:bit" が表示されるようになります。

手順が多い章です。SoftDevice という Nordic 製のバイナリを micro:bit に別途書き込む必要があり、プロジェクトの設定も初級編とは大きく異なります。スマホとマイコンを両方手元に置いて進めてください。ここを通り抜ければ、次の章からは BLE の機能をコードで一枚ずつ重ねていきます。

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

probe-rs で micro:bit に書き込みます。

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

設定ファイルを3つ用意します。

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

`nrf52833` は使用するチップを指定するフィーチャです。`s140` と `ble-peripheral` が BLE の通信に必要で、`ble-gatt-server` は3章以降で使います。`critical-section-impl` は no_std 環境でクリティカルセクション（割り込み制御）の実装を提供するフィーチャです。`nrf-softdevice-s140` は S140 の定数・型定義を含む補助クレートで、`nrf-softdevice` の s140 フィーチャと組み合わせて使います。

### memory.x

SoftDevice がフラッシュの先頭 156KB を使うため、Rust アプリは 0x27000 から始めます。

```text
MEMORY
{
  FLASH : ORIGIN = 0x00027000, LENGTH = 356K
  RAM   : ORIGIN = 0x20006000, LENGTH = 104K
}
```

RAM の開始も通常より後ろにずらしています。SoftDevice が RAM の前半を使うためです。初級編の memory.x とは異なる点に注意してください。

### .cargo/config.toml

```toml
[build]
target = "thumbv7em-none-eabihf"

[env]
DEFMT_LOG = "debug"

[target.thumbv7em-none-eabihf]
rustflags = ["-C", "link-arg=-Tlink.x", "-C", "link-arg=-Tdefmt.x"]
runner = "probe-rs run --chip nRF52833_xxAA"
```

defmt は組み込み向けのログライブラリです。RTT（Real-Time Transfer）という仕組みでホスト PC にログを転送します。`DEFMT_LOG = "debug"` を設定しないとログが出力されません。`link.x` はメモリレイアウト（`memory.x`）を読み込むリンカスクリプトです。`defmt.x` は defmt のシンボル情報を渡すためのものです。どちらも `rustflags` で明示的に渡す必要があります。

## アドバタイズのコードを書く

ペリフェラルは接続を待つ間、自分の存在を定期的に電波で発信しています。この発信をアドバタイズと呼びます。スマホが近くをスキャンすると、アドバタイズを受け取って端末一覧に "micro:bit" が表示されます。

`src/main.rs` を次のように書きます。この章では「スマホに見つけてもらえる状態」まで確認します。気温の送信と LED 操作は3章・4章で追加します。

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

`embassy_nrf::init()` は `Softdevice::enable` より先に呼ぶ必要があります。逆にすると embassy-time の RTC1 タイマドライバが起動せず、次の章で Notify ループが止まります。

## ビルドして書き込む

```sh
cargo run --release
```

probe-rs がフラッシュに書き込み、そのまま実行を開始します。RTT ログが流れ始めれば書き込み成功です。

## nRF Connect で確認する

Android スマホに nRF Connect をインストールしてスキャンします（iPhone の場合も App Store から同じアプリを入手できます）。スキャンを開始すると "micro:bit" が表示されます。

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

スマホから micro:bit を見つけられました。次の章では気温センサの値を Notify で送ります。
