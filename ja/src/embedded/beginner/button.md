# ボタンで絵を切り替える

ボタンの入力を読んで、押されたボタンに応じて LED の絵を切り替えます。

## ボタンの読み方

micro:bit の A・B ボタンは、押している間だけ配線が LOW になります。だから「ピンが LOW か」を見る `is_low()` で、押されているかどうかを判定できます。

```rust
let mut button_a = board.buttons.button_a;

if button_a.is_low().unwrap() {
    // A が押されている
}
```

`is_low()` は `embedded-hal` というクレートのトレイト `InputPin` が定義するメソッドです。このトレイトをスコープに入れないとメソッドが見えないので、ファイルの先頭で明示的に `use` しておきます。

```rust
use embedded_hal::digital::InputPin;
```

`is_low()` は `&mut self` を取る定義です。そのため、ボタンを受ける変数は `let mut` で宣言します。

## ボードで確かめる

前のページで書いていた `main.rs` をまるごと次のコードに書き換えてください。

```rust
#![no_std]
#![no_main]

use cortex_m_rt::entry;
use embedded_hal::digital::InputPin;
use microbit::{
    display::blocking::Display,
    hal::Timer,
    Board,
};
use panic_halt as _;

#[entry]
fn main() -> ! {
    let board = Board::take().unwrap();
    let mut timer = Timer::new(board.TIMER0);
    let mut display = Display::new(board.display_pins);

    let mut button_a = board.buttons.button_a;
    let mut button_b = board.buttons.button_b;

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
        if button_a.is_low().unwrap() {
            display.show(&mut timer, smiley, 500);
        } else if button_b.is_low().unwrap() {
            display.show(&mut timer, heart, 500);
        } else {
            display.show(&mut timer, blank, 100);
        }
    }
}
```

`Cargo.toml` にも追加が必要です。`embedded-hal` を依存に加えます。

```toml
[dependencies]
cortex-m-rt = "0.7.5"
embedded-hal = "1.0.0"
microbit-v2 = "0.16.0"
panic-halt  = "1.0.0"
```

書き換えたらボードをつないで書き込みます。

```sh
cargo embed
```

A を押すとスマイル、B を押すとハートが光ります。

---

ボタンの状態を読んで、押したボタンに応じた絵を出せるようになりました。次のページでは加速度センサを使って、ボードを傾けると絵が変わるようにします。
