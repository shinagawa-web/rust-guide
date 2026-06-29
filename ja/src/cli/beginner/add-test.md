# テストを追加する

前のページでバグは直りました。ただ、このまま終えると、あとからコードを変更したときに同じバグが再び入り込んでも気づけません。そこで、日本語が正しく数えられることを確かめるテストを追加して、修正を守れるようにします。

`counter.rs` の下半分には、もともとテストが書かれています。前に読むのを保留していた部分です。まずはそれを読み、書き方をつかんでから、日本語のテストを足します。

## 既存のテストを読む

`counter.rs` の下半分はこうなっています。

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn counts_lines_chars_bytes() {
        let content = "hello\nworld\n";
        let c = Counter::count(content);
        assert_eq!(c.lines, 2);
        assert_eq!(c.chars, 12);
        assert_eq!(c.bytes, 12);
    }
}
```

初めて見る書き方が並んでいるので、上から順に見ていきます。

```rust
#[cfg(test)]
mod tests {
```

`mod tests` は、テストをまとめておく場所です。`mod` は前に `main.rs` で `mod counter;` として出てきた、まとまりを作る書き方です。その上の `#[cfg(test)]` は、このまとまりをテストのときだけ有効にするための目印です。`cargo test` で実行するときだけコンパイルされ、`cargo build` や `cargo run` では無視されます。

```rust
    use super::*;
```

`super` はひとつ外側、つまり `counter.rs` 本体を指します。`use super::*;` で、本体にある `Counter` や `count` をテストの中からそのままの名前で使えるようにしています。これがなければ、`Counter` を使うたびに `super::Counter` と書くことになります。

```rust
    #[test]
    fn counts_lines_chars_bytes() {
```

`#[test]` は「これはテスト関数です」という目印です。この目印が付いた関数が `cargo test` で実行されます。`counts_lines_chars_bytes` は関数の名前で、何を確かめるテストかがわかるように付けられています。

```rust
        let content = "hello\nworld\n";
        let c = Counter::count(content);
```

テストの中身です。`hello\nworld\n` という文字列を用意し、それを `Counter::count` に渡して結果を `c` で受け取っています。`\n` は改行を表します。

```rust
        assert_eq!(c.lines, 2);
        assert_eq!(c.chars, 12);
        assert_eq!(c.bytes, 12);
```

`assert_eq!` は、2 つの値が等しいことを確かめる書き方です。左に実際の値、右に期待する値を渡します。等しければそのまま通り、違っていればその場でテストが失敗します。ここでは `hello\nworld\n` を数えた結果が、行数 2・文字数 12・バイト数 12 になるはずだと確かめています。

## 日本語のテストを追加する

既存のテストにならって、日本語のファイルでも正しく数えられることを確かめるテストを足します。`mod tests` の中、既存のテスト関数の下に次を書き加えます。

```rust
    #[test]
    fn counts_multibyte_chars() {
        let content = "こんにちは\n世界\n";
        let c = Counter::count(content);
        assert_eq!(c.lines, 2);
        assert_eq!(c.chars, 9);
        assert_eq!(c.bytes, 23);
    }
```

中身は既存のテストと同じ形で、渡す文字列を日本語にしただけです。期待する値の `9` と `23` は、前のページで数えた文字数とバイト数です。文字数 9・バイト数 23 になっていれば、日本語が正しく数えられていると確かめられます。

書き加えると、`mod tests` の中にテスト関数が 2 つ並びます。

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn counts_lines_chars_bytes() {
        let content = "hello\nworld\n";
        let c = Counter::count(content);
        assert_eq!(c.lines, 2);
        assert_eq!(c.chars, 12);
        assert_eq!(c.bytes, 12);
    }

    #[test]
    fn counts_multibyte_chars() {
        let content = "こんにちは\n世界\n";
        let c = Counter::count(content);
        assert_eq!(c.lines, 2);
        assert_eq!(c.chars, 9);
        assert_eq!(c.bytes, 23);
    }
}
```

## テストを実行する

テストは `cargo test` で実行します。

```sh
$ cargo test
```

```text
test result: ok. 2 passed; 0 failed
```

2 つのテストがどちらも通りました。最初からあったテストと、いま足した日本語のテストです。前のページの修正が、既存のテストを壊さずに日本語にも対応できていることが確かめられました。

## テストが修正を守る

もし前のページの修正をしていなかったら、追加したテストは通りません。`chars` がバイト数の `23` になり、期待した `9` と食い違って失敗します。

```text
assertion `left == right` failed
  left: 23
 right: 9
```

このテストがあれば、あとからの変更で `chars` の数え方が元に戻ってしまっても、`cargo test` で失敗としてすぐ気づけます。直した内容が元に戻っていないかを確かめられる、これがテストを追加する理由です。

これで、最初に決めた 2 つの条件、既存のテストが通ることと日本語ファイルのテストを追加することの両方を満たせました。次のページでは、ここまでの変更をふり返り、何をどう変えたかをまとめます。
