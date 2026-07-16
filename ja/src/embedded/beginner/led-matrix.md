# LED マトリクスに絵を出す＋テストを書く

このページでは 2 つのことをします。ひとつは前のページで書き込んだハートのパターンを好きな絵に変えること、もうひとつはその絵のパターンをボードなしでテストすることです。

LED に表示する絵は `[[u8; 5]; 5]`、5 行 5 列の数の格子で表します。1 が光る LED、0 が消えた LED です。この格子は固定長なのでヒープを使いません。no_std の世界でそのまま扱えます。そして値を返すだけの純粋な関数として書けば、マイコンを持ち出さなくても、手元のパソコンで `cargo test` して確かめられます。

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

## パターンを関数にする

この格子に名前を付けて関数にします。

```rust
fn smiley() -> [[u8; 5]; 5] {
    [
        [0, 0, 0, 0, 0],
        [0, 1, 0, 1, 0],
        [0, 0, 0, 0, 0],
        [1, 0, 0, 0, 1],
        [0, 1, 1, 1, 0],
    ]
}
```

`-> [[u8; 5]; 5]` は「5 個の `u8` を 5 行並べた格子を返す」という意味です。引数なし・返り値だけの関数なので、ハードウェアに一切触れません。この性質のおかげで、ボードが無くてもテストを書けます。

## ホストでテストする

パターンの正しさをボードなしで確かめます。

### Cargo.toml を変える

`[features]` セクションを追加し、ハードウェア向けのクレートを `embedded` feature にまとめます。`optional = true` にしておくことで、`embedded` feature を無効にするとこれらのクレートをビルドから外せます。

```toml
[features]
default = ["embedded"]
embedded = ["dep:cortex-m-rt", "dep:microbit-v2", "dep:panic-halt"]

[dependencies]
cortex-m-rt = { version = "0.7.5", optional = true }
microbit-v2  = { version = "0.16.0", optional = true }
panic-halt   = { version = "1.0.0", optional = true }
```

`default = ["embedded"]` があるので、`cargo build` や `cargo embed` はこれまでどおり動きます。

### main.rs を変える

ファイル先頭の 2 行と `use` の行、そして `main` 関数に `#[cfg(...)]` を付け足します。

```rust
#![cfg_attr(not(test), no_std)]
#![cfg_attr(not(test), no_main)]

#[cfg(feature = "embedded")]
use cortex_m_rt::entry;
#[cfg(feature = "embedded")]
use microbit::{display::blocking::Display, hal::Timer, Board};
#[cfg(feature = "embedded")]
use panic_halt as _;

fn smiley() -> [[u8; 5]; 5] {
    [
        [0, 0, 0, 0, 0],
        [0, 1, 0, 1, 0],
        [0, 0, 0, 0, 0],
        [1, 0, 0, 0, 1],
        [0, 1, 1, 1, 0],
    ]
}

#[cfg(feature = "embedded")]
#[entry]
fn main() -> ! {
    let board = Board::take().unwrap();
    let mut timer = Timer::new(board.TIMER0);
    let mut display = Display::new(board.display_pins);

    let blank = [[0; 5]; 5];

    loop {
        display.show(&mut timer, smiley(), 1000);
        display.show(&mut timer, blank, 1000);
    }
}
```

`#![cfg_attr(not(test), no_std)]` は「テスト以外のビルドでは `no_std` にする」という属性です。`cfg_attr` は条件が真のときだけ属性を付けます。`#![cfg_attr(not(test), no_main)]` も同様で、`cargo test` が生成するテストハーネスは自前の `main` を持つため、テスト時に `no_main` が残るとビルドが失敗します。`#[cfg(feature = "embedded")]` は `embedded` feature が有効なときだけコンパイルに含めます。

### テストを書く

`smiley()` のパターンが期待どおりかを確かめるテストを、同じファイルの末尾に追加します。

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn smiley_eyes_are_on() {
        let p = smiley();
        assert_eq!(p[1][1], 1); // 左目
        assert_eq!(p[1][3], 1); // 右目
    }

    #[test]
    fn smiley_center_is_off() {
        let p = smiley();
        assert_eq!(p[1][2], 0); // 目と目の間は消えている
    }
}
```

`#[cfg(test)]` で囲んでいるので、`cargo build` や `cargo embed` にはこのコードは含まれません。

### 実行する

`.cargo/config.toml` がデフォルト target を micro:bit 向けに固定しているため、`cargo test` だけではパソコンで動かせません。また `embedded` feature を有効にしたままだと `microbit-v2` などがパソコン向けにビルドされてエラーになります。そのため、ホストの target と `--no-default-features` をどちらも明示して実行します。

```sh
# Mac（Apple Silicon）
cargo test --no-default-features --target aarch64-apple-darwin

# Mac（Intel）
cargo test --no-default-features --target x86_64-apple-darwin

# Linux
cargo test --no-default-features --target x86_64-unknown-linux-gnu
```

成功すると次のように出ます。

```text
running 2 tests
test tests::smiley_center_is_off ... ok
test tests::smiley_eyes_are_on ... ok

test result: ok. 2 passed; 0 failed; finished in 0.00s
```

## ボードで確かめる

ボードをつないで `cargo embed` を実行します。

```sh
cargo embed
```

スマイルが 1 秒ごとに点滅すれば成功です。`--no-default-features` なしで実行するので `embedded` feature は有効なままで、書き込みはこれまでと変わりません。

---

パターンを関数にして、ボードなしでテストできました。次のページでは、ボタンを押したときに絵が変わるようにします。
