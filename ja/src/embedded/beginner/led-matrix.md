# LED マトリクスに絵を出す

前のページで書き込んだハートのパターンを好きな絵に変えます。

## 好きな絵を描く

ここではスマイルを描きます。5×5 のマスを頭の中で思い浮かべて、光らせたい位置を `O`、消す位置を `.` にします。

```
. . . . .   row 0
. O . O .   row 1  ← 目
. . . . .   row 2
O . . . O   row 3  ← 口の角
. O O O .   row 4  ← 口の弧
```

コードに直すとこうなります。

```rust
[
    [0, 0, 0, 0, 0],
    [0, 1, 0, 1, 0],
    [0, 0, 0, 0, 0],
    [1, 0, 0, 0, 1],
    [0, 1, 1, 1, 0],
]
```

## ボードで確かめる

前のページの `main.rs` を開いて、`heart` のパターンをスマイルに書き換えます。

```rust
#![no_std]
#![no_main]

use cortex_m_rt::entry;
use microbit::{display::blocking::Display, hal::Timer, Board};
use panic_halt as _;

#[entry]
fn main() -> ! {
    let board = Board::take().unwrap();
    let mut timer = Timer::new(board.TIMER0);
    let mut display = Display::new(board.display_pins);

    let smiley = [
        [0, 0, 0, 0, 0],
        [0, 1, 0, 1, 0],
        [0, 0, 0, 0, 0],
        [1, 0, 0, 0, 1],
        [0, 1, 1, 1, 0],
    ];
    let blank = [[0; 5]; 5];

    loop {
        display.show(&mut timer, smiley, 1000);
        display.show(&mut timer, blank, 1000);
    }
}
```

ボードをつないで書き込みます。

```sh
cargo embed
```

スマイルが 1 秒ごとに点滅すれば成功です。

---

好きな絵のパターンをボードに表示できました。次のページでは、ボタンを押したときに絵が変わるようにします。
