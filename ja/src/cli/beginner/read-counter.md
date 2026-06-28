# counter.rs を読む

前のページで保留にした `Counter` と `Counter::count` の中身は `counter.rs` にあります。このファイルを読むと、行数・文字数・バイト数をどう数えているのかがわかります。

## counter.rs を開く

`counter.rs` を開くと、上半分にこう書かれています。

```rust
pub struct Counter {
    pub lines: usize,
    pub chars: usize,
    pub bytes: usize,
}

impl Counter {
    pub fn count(content: &str) -> Counter {
        let lines = content.lines().count();
        let chars = content.len();
        let bytes = content.len();
        Counter { lines, chars, bytes }
    }
}
```

ファイルの下半分には `#[cfg(test)]` で始まるテストもありますが、そちらは後のテストのページで読みます。ここでは上半分の 2 つのまとまり、`struct` と `impl` を順に見ていきます。

## struct ― データをまとめる

```rust
pub struct Counter {
    pub lines: usize,
    pub chars: usize,
    pub bytes: usize,
}
```

`struct` は複数のデータをひとまとめにする仕組みです。`Counter` には数えた結果を入れるための 3 つの値が入っています。

| フィールド | 型 | 意味 |
|---|---|---|
| `lines` | `usize` | 行数 |
| `chars` | `usize` | 文字数 |
| `bytes` | `usize` | バイト数 |

型はすべて `usize` で、前のページで見た「0 以上の個数を表す整数」です。

各フィールドと `struct` 自体に付いている `pub` は、他のファイルから使えるようにするための指定です。`main.rs` が `Counter` を受け取り、`result.lines` のようにフィールドへアクセスできていたのは、ここに `pub` が付いているからです。

## impl と count ― 数える処理

```rust
impl Counter {
    pub fn count(content: &str) -> Counter {
```

`impl Counter` は、`Counter` に関係する処理をまとめて書く場所です。その中の `count` が、実際に数を数える関数です。

`main.rs` ではこの関数を `Counter::count(&content)` と呼んでいました。`型名::関数名` の形で、`Counter` に紐づいた `count` を呼び出しています。

引数の `content: &str` は、数える対象の文字列です。`&` が付いているので、文字列そのものではなく中身への参照を受け取ります。戻り値の `-> Counter` は、数えた結果を `Counter` にまとめて返すという意味です。

中身を 1 行ずつ見ます。

```rust
        let lines = content.lines().count();
```

`content.lines()` は中身を行ごとに区切り、`.count()` でその個数を数えます。これが行数です。

```rust
        let chars = content.len();
        let bytes = content.len();
```

`content.len()` は中身の長さを返します。それを `chars` と `bytes` の両方に入れています。

```rust
        Counter { lines, chars, bytes }
```

最後に、数えた 3 つの値を `Counter` にまとめて返します。`lines`・`chars`・`bytes` という変数名がフィールド名と同じなので、このように並べるだけでそれぞれのフィールドに入ります。関数の最後の式が戻り値になるので、これがそのまま `count` の戻り値です。

## chars と bytes が同じ計算になっている

ここで気づいてほしいのが、`chars` と `bytes` がまったく同じ `content.len()` で計算されている点です。

`content.len()` が返すのは、文字の個数ではなくバイト数です。つまり `chars` には文字数ではなくバイト数が入っています。`bytes` と同じ値になるのはこのためです。

英語のように 1 文字が 1 バイトの文字だけなら、文字数とバイト数は一致するので問題は表に出ません。`hello.txt` で `chars` と `bytes` がどちらも `16` だったのはこれが理由です。しかし日本語のようにマルチバイトの文字が混ざると、両者はずれます。このガイドの最初で見た「日本語ファイルで `chars` がおかしくなる」バグの正体が、この `chars = content.len()` です。

なぜ `len()` が文字数にならないのか、文字数を正しく数えるにはどうするのかは、次のページで詳しく見ます。

## main.rs に戻る

`Counter` の形がわかったので、前のページで保留にした `main.rs` の最後の 2 行に戻ります。

```rust
    let result = Counter::count(&content);
    println!("lines: {}  chars: {}  bytes: {}", result.lines, result.chars, result.bytes);
```

1 行目は、読み込んだ中身を `Counter::count` に渡し、返ってきた `Counter` を `result` で受け取っています。`&content` と参照で渡しているのは、中身をコピーせずに読んでもらうためです。

2 行目の `result.lines`・`result.chars`・`result.bytes` は、`result` の中の 3 つのフィールドを取り出す書き方です。さきほど `struct Counter` で定義した `lines`・`chars`・`bytes` が、ここで取り出されています。それを `println!` で 1 行にまとめて表示しているのが、`lines: 3  chars: 16  bytes: 16` という出力でした。

これで `main.rs` と `counter.rs` の全体を読み終えました。次のページから、`chars` のバグを直していきます。
