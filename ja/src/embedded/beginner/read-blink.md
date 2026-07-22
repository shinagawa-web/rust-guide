# 光らせたコードを読む

前のページで書き込んだプロジェクトは、4つのファイルで動いています。

```text
rust-guide-sample-beginner-embedded/
├── Cargo.toml          # 使うクレート（ライブラリ）の一覧
├── Embed.toml          # cargo embed の設定
├── .cargo/config.toml  # ビルドの設定
└── src/main.rs         # プログラム本体
```

このページで、それぞれ何をしているかを読んでいきます。

## Cargo.toml

```toml
[dependencies]
cortex-m-rt = "0.7.5"
microbit-v2 = "0.16.0"
panic-halt  = "1.0.0"
```

Rust では外部のライブラリを「クレート」と呼びます。`Cargo.toml` に書くと、ビルド時に自動でダウンロードして使えるようになります。

- `microbit-v2` — micro:bit v2 のボード専用ライブラリです。LED・ボタン・センサを扱う API がここに入っています。
- `cortex-m-rt` — マイコンの起動処理を担います。電源が入った直後からプログラムが動き出すまでの段取りを引き受けます。
- `panic-halt` — panic が起きたらその場でフリーズする処理を提供します。

## .cargo/config.toml

```toml
[build]
target = "thumbv7em-none-eabihf"

[target.thumbv7em-none-eabihf]
rustflags = ["-C", "link-arg=-Tlink.x"]
runner = "probe-rs run --chip nRF52833_xxAA"
```

`target` の行が、ビルド先を固定しています。`thumbv7em-none-eabihf` は micro:bit の CPU に対応する名前で、「ボードを光らせるまで」のページで `rustup target add` したものです。この行があるので、`cargo build` や `cargo embed` のたびに `--target` を指定しなくて済みます。

`rustflags` と `runner` はそのままにしておく設定です。

## Embed.toml

```toml
[default.general]
chip = "nRF52833_xxAA"
```

`cargo embed` が書き込む先のマイコンを指定しています。このファイルがあるので、`cargo embed` を実行するだけで接続された micro:bit に書き込めます。

## src/main.rs

プログラム本体です。

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

    let heart = [
        [0, 1, 0, 1, 0],
        [1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1],
        [0, 1, 1, 1, 0],
        [0, 0, 1, 0, 0],
    ];
    let blank = [[0; 5]; 5];

    loop {
        display.show(&mut timer, heart, 1000);
        display.show(&mut timer, blank, 1000);
    }
}
```

## ファイルの先頭

```rust
#![no_std]
#![no_main]
```

マイコンには OS がありません。OS を前提にした機能（文字を画面に出す、メモリを動的に確保するなど）が使えないので、`#![no_std]` でその機能群を外します。`#![no_main]` は、OS がプログラムを起動するときの決まりに従わない、という宣言です。この2行はマイコン向けの Rust に共通して付きます。

```rust
use panic_halt as _;
```

プログラムが想定外の状態に陥ったとき、Rust は処理を止めます。そのときに何をするかを、`panic-halt` クレートが提供しています。panic が起きたらその場でフリーズする、という最小限の実装です。

## エントリポイント

```rust
#[entry]
fn main() -> ! {
```

`#[entry]` は、このプログラムの開始点はここだ、という目印です。OS が無い代わりに `cortex-m-rt` というクレートがプログラムの起動を担っていて、`#[entry]` の付いた関数を呼び出します。

`-> !` は「この関数は返らない」という意味です。OS があれば main が終わった後に OS が制御を引き取りますが、マイコンには引き取る OS がありません。電源が入っている限りずっと動き続けるのが前提なので、返らないことをコンパイラに伝えておきます。

## ボードの初期化

```rust
let board = Board::take().unwrap();
let mut timer = Timer::new(board.TIMER0);
let mut display = Display::new(board.display_pins);
```

`Board::take()` は、ボード上の LED・ボタン・タイマなどを Rust から操作するための構造体を取得します。取得後は `board.display_pins` や `board.TIMER0` のように、各部品へのアクセスが手に入ります。`take()` は一度しか呼べません。ハードウェアは1つしか無いので、二度呼んだときの動作は定義されていません。`.unwrap()` は「取れたらその値を使う」です。

`Timer::new(board.TIMER0)` は、マイコン内蔵のタイマーを使う準備をします。後で `display.show()` に渡し、何ミリ秒表示するかを計るために使います。

`Display::new(board.display_pins)` は、5×5 の LED を操作する準備をします。

## LED のパターン

```rust
let heart = [
    [0, 1, 0, 1, 0],
    [1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1],
    [0, 1, 1, 1, 0],
    [0, 0, 1, 0, 0],
];
let blank = [[0; 5]; 5];
```

`heart` は 5×5 の数字の格子です。`1` が光る LED、`0` が消えた LED に対応しています。並べると、ハートの形が見えます。

`blank` は全部 `0` の 5×5 です。`[[0; 5]; 5]` は「`0` を5つ並べた行を、5行並べる」という書き方で、全部消えた状態を表します。

## 繰り返す

```rust
loop {
    display.show(&mut timer, heart, 1000);
    display.show(&mut timer, blank, 1000);
}
```

`loop` は中の処理を永遠に繰り返します。マイコンのプログラムは電源が入っている限り動き続けるので、`loop` で囲むのが基本の形です。

`display.show(&mut timer, heart, 1000)` はハートを 1000 ミリ秒（1秒）表示します。次の行で全消灯を 1 秒。これを繰り返すと、1秒ごとにハートが点滅します。

---

コードの全体が読めました。次のページでは、このコードに手を加えて、5×5 の LED に好きな絵を出せるようにします。
