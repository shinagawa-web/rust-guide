# Rust の基本構文

サーバーが動くことは確認できました。次はコードを読んでいきます。ただし、いきなりサンプルコードを開いても知らない構文が並んでいて読み進められません。ここでは次のページから必要になる基本的な書き方を先に押さえます。

## let ― 変数を宣言する

変数を宣言するには `let` を使います。

```rust
fn main() {
    let name = "Alice";
    let age = 30;
    println!("{} は {} 歳", name, age);
}
```

Rust の変数はデフォルトで変更できません。値を後から書き換えたい場合は `mut` をつけます。

```rust
fn main() {
    let mut count = 0;
    println!("{}", count);
    count = 1;
    println!("{}", count);
}
```

## 基本的な型

変数には型があります。Rust は型推論があるので多くの場合は省略できますが、場合によっては明示が必要です。

サンプルコードに出てくる型は次の 2 つです。

| 型 | 意味 |
|---|---|
| `u32` | 符号なし 32 ビット整数。0 以上の整数 |
| `String` | 文字列 |

コード中の `"Alice"` のような文字列リテラルは `String` とは別の型です。`String` として扱うには `.to_string()` で変換します。

```rust
fn main() {
    let name: String = "Alice".to_string();
    println!("{}", name);
}
```

サンプルコードで `.to_string()` が随所に出てくるのはこのためです。

## println! ― 出力する

`println!` は標準出力に文字列を出力します。`{}` の部分に変数の値が入ります。

```rust
fn main() {
    let name = "Alice";
    println!("Hello!");
    println!("名前: {}", name);
}
```

## fn ― 関数を定義する

関数は `fn` で定義します。引数は `名前: 型` の形で書き、戻り値の型は `->` の後に書きます。

```rust
fn greet(name: String) -> String {
    format!("Hello, {}!", name)
}

fn main() {
    let message = greet("Alice".to_string());
    println!("{}", message);
}
```

Rust では最後の式が戻り値になるので、`return` を省略できます。戻り値がない関数は `->` ごと省略します。

```rust
fn print_name(name: String) {
    println!("{}", name);
}

fn main() {
    print_name("Alice".to_string());
}
```

## vec! ― 複数の値をまとめる

同じ型の値を複数まとめて持つには `Vec` を使います。`vec!` を使うと初期値を並べて作れます。

```rust
fn main() {
    let names = vec!["Alice", "Bob", "Carol"];
    println!("{}", names[0]);
    println!("{}", names[1]);
}
```

要素には `[インデックス]` でアクセスします。インデックスは 0 始まりです。

## if ― 条件によって処理を分ける

条件によって処理を変えるには `if` を使います。

```rust
fn main() {
    let score = 80;
    if score >= 60 {
        println!("合格");
    } else {
        println!("不合格");
    }
}
```

`else` は省略できます。

## for ― 繰り返す

コレクションの要素を 1 つずつ処理するには `for` を使います。

```rust
fn main() {
    let names = vec!["Alice", "Bob", "Carol"];
    for name in names {
        println!("{}", name);
    }
}
```
