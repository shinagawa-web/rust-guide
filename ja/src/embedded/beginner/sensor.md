# センサで絵を動かす

加速度センサの値を読んで、ボードを横に傾けると絵が切り替わるようにします。

## 加速度センサの読み方

micro:bit に載っている加速度センサは、ボードが受けている重力加速度を X・Y・Z の3方向で返します。ボードを右に傾けると X が正に増え、左に傾けると負になります。この値を閾値と比べるだけで「左か右か」を判定できます。

センサは I2C でマイコンとやりとりしているので、`lsm303agr` クレートを使って読み取ります。`lsm303agr` は embedded-hal 0.2 の I2C トレイトを要求しますが、microbit-v2 が使う HAL は embedded-hal 1.0 を実装しています。バージョンが違うので、薄いラッパーを書いて橋渡しします。Cargo.toml には `embedded-hal` と `lsm303agr` を追加します。

```toml
[dependencies]
cortex-m-rt    = "0.7.5"
embedded-hal   = "1.0.0"
embedded-hal-02 = { package = "embedded-hal", version = "0.2.7" }
lsm303agr      = "0.2"
microbit-v2    = "0.16.0"
panic-halt     = "1.0.0"
```

センサの初期化はこうです。

```rust
let i2c = I2cCompat(twim::Twim::new(
    board.TWIM0,
    board.i2c_internal.into(),
    FREQUENCY_A::K100,
));
let mut sensor = Lsm303agr::new_with_i2c(i2c);
sensor.init().unwrap();
sensor.set_accel_odr(AccelOutputDataRate::Hz10).unwrap();
```

`board.i2c_internal` が micro:bit の内部センサにつながっている I2C バスです。`I2cCompat` は embedded-hal 1.0 の I2C を 0.2 のインターフェースに変換するラッパーで、`main.rs` に定義します。`set_accel_odr` でサンプリングレートを設定します。`Hz10` は 1 秒に 10 回測定するという意味です。

値の読み取りはこうです。

```rust
if sensor.accel_status().unwrap().xyz_new_data {
    let data = sensor.accel_data().unwrap();
    let x = data.x;
}
```

`xyz_new_data` で新しいデータが来ているかを確認してから `accel_data()` で取得します。`data.x` が X 軸の加速度をミリ g で返します。水平に置いたとき 0、右に 45° 傾けると約 700、左に 45° 傾けると約 −700 になります。

## ボードで確かめる

`main.rs` をまるごと書き換えます。

```rust
#![no_std]
#![no_main]

use cortex_m_rt::entry;
use lsm303agr::{AccelOutputDataRate, Lsm303agr};
use microbit::{
    display::blocking::Display,
    hal::{twim, Timer},
    pac::twim0::frequency::FREQUENCY_A,
    Board,
};
use panic_halt as _;

struct I2cCompat<T>(T);

impl<T: embedded_hal::i2c::I2c> embedded_hal_02::blocking::i2c::WriteRead for I2cCompat<T> {
    type Error = T::Error;
    fn write_read(&mut self, addr: u8, bytes: &[u8], buf: &mut [u8]) -> Result<(), Self::Error> {
        self.0.write_read(addr, bytes, buf)
    }
}

impl<T: embedded_hal::i2c::I2c> embedded_hal_02::blocking::i2c::Write for I2cCompat<T> {
    type Error = T::Error;
    fn write(&mut self, addr: u8, bytes: &[u8]) -> Result<(), Self::Error> {
        self.0.write(addr, bytes)
    }
}

#[entry]
fn main() -> ! {
    let board = Board::take().unwrap();
    let mut timer = Timer::new(board.TIMER0);
    let mut display = Display::new(board.display_pins);

    let i2c = I2cCompat(twim::Twim::new(
        board.TWIM0,
        board.i2c_internal.into(),
        FREQUENCY_A::K100,
    ));
    let mut sensor = Lsm303agr::new_with_i2c(i2c);
    sensor.init().unwrap();
    sensor.set_accel_odr(AccelOutputDataRate::Hz10).unwrap();

    let smiley = [
        [0, 0, 0, 0, 0],
        [0, 1, 0, 1, 0],
        [0, 0, 0, 0, 0],
        [1, 0, 0, 0, 1],
        [0, 1, 1, 1, 0],
    ];
    let heart = [
        [0, 1, 0, 1, 0],
        [1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1],
        [0, 1, 1, 1, 0],
        [0, 0, 1, 0, 0],
    ];
    let blank = [[0u8; 5]; 5];

    loop {
        if sensor.accel_status().unwrap().xyz_new_data {
            let data = sensor.accel_data().unwrap();
            let x = data.x;
            if x > 400 {
                display.show(&mut timer, smiley, 200);
            } else if x < -400 {
                display.show(&mut timer, heart, 200);
            } else {
                display.show(&mut timer, blank, 200);
            }
        }
    }
}
```

閾値を 400 にしているので、少し傾けただけで切り替わります。

```sh
cargo embed
```

右に傾けるとスマイル、左に傾けるとハートが表示されれば成功です。

---

加速度センサの値を読んで絵を動かせました。次のページではここまでをふりかえります。
