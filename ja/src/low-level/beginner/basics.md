# Rust の基本構文

このあとのページで、サンプルの `src/main.rs` と `src/perm.rs` を読んでいきます。その前に、コードを読むのに必要な Rust の構文を先に押さえます。文法を網羅するのではなく、`fmode` のコードに実際に出てくるものだけを取り上げます。

## 変数と型

変数は `let` で宣言します。

```rust
let path = &args[1];
```

Rust では型が静的に決まりますが、多くの場合は右辺から型を推論してくれるので、いちいち書く必要はありません。推論に任せず明示することもできます。

```rust
let args: Vec<String> = env::args().collect();
let mode: u32 = metadata.permissions().mode();
```

`Vec<String>` は文字列の可変長リスト、`u32` は 32 ビットの符号なし整数、`String` は文字列です。パーミッションの整数 `mode` は `u32` で扱います。

変数は標準で再代入できません。あとから書き換えたい場合だけ `mut` を付けます。

```rust
let mut s = String::new();
s.push(file_type(mode));
```

`s` は空の `String` として作り、あとから文字を push して組み立てるので `mut` が必要です。

## 関数

関数は `fn` で定義します。引数は `名前: 型`、戻り値の型は `->` の後ろに書きます。

```rust
fn rwx(bits: u32) -> String {
    // ...
}
```

これは `u32` を 1 つ受け取り、`String` を返す関数です。種別を返す関数なら戻り値は `char` です。

```rust
fn file_type(mode: u32) -> char {
    // ...
}
```

戻り値がない関数は `->` を省略します。`fn main()` がその例です。関数の最後の式が戻り値になり、`return` は省略できます。

## 参照と借用

`&` を付けると、値そのものを渡す代わりに「その値を借りる」ことになります。これを参照と呼びます。

```rust
let path = &args[1];
```

`args` の中の文字列を所有権ごと取り出すのではなく、`path` から借りて見るだけ、という意味です。借りているので `args` 側はそのまま残ります。関数に値を渡すときも同じで、`format_mode` が返した `String` を `println!` に貸す形になります。

```rust
s.push_str(&rwx((mode >> 6) & 0b111));
```

ここでは `rwx(...)` が返した `String` を `&` で借りて `push_str` に渡しています。Rust の所有権は奥が深いテーマですが、このガイドで読むコードに出てくるのは「値を借りるときに `&` を付ける」というこの形だけです。

## match と if

`match` は、値が取りうるパターンごとに処理を分ける式です。サンプルでは、ファイルの情報取得が成功したか失敗したかで分けるのに使っています。

```rust
let metadata = match fs::metadata(path) {
    Ok(m) => m,
    Err(e) => {
        eprintln!("エラー: {}: {}", path, e);
        process::exit(1);
    }
};
```

`fs::metadata` は成功（`Ok`）か失敗（`Err`）のどちらかを返します。`match` はそのすべてのパターンを書く必要があり、成功なら中身の `m` を取り出し、失敗ならメッセージを出して終了します。

条件で分けるだけなら `if` を使います。

```rust
if args.len() < 2 {
    eprintln!("エラー: パスの指定がありません");
    process::exit(1);
}
```

引数の数が足りなければエラーを出して終了する、という分岐です。

## モジュール

サンプルはコードを `main.rs` と `perm.rs` の 2 ファイルに分けています。別ファイルを使うには `mod` で読み込みます。

```rust
mod perm;
```

これで `src/perm.rs` の中身が `perm` というモジュールとして使えるようになり、その中の関数は `perm::format_mode` のように呼び出します。

```rust
println!("{}  {}", perm::format_mode(mode), path);
```

ただし、モジュールの中身は標準では外から見えません。外部から呼べるようにするには `pub` を付けます。

```rust
pub fn format_mode(mode: u32) -> String {
    // ...
}
```

`format_mode` には `pub` が付いているので `main.rs` から呼べます。一方、同じ `perm.rs` の中だけで使う `file_type` や `rwx` には `pub` が付いておらず、モジュールの内側に閉じています。
