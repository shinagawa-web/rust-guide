# Rust の基本構文

ツールが動くことは確認できました。次はコードを読んでいきます。ただし、いきなりサンプルコードを開いても知らない構文が並んでいて読み進められません。ここでは次のページから必要になる基本的な書き方を先に押さえます。

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

サンプルコードに出てくる型は次の 3 つです。

| 型 | 意味 |
|---|---|
| `usize` | 0 以上の整数。要素数や長さを表すときに使う |
| `String` | 文字列 |
| `&str` | 文字列の参照（借りているだけで、自分では持たない文字列） |

`usize` は行数や文字数のような「個数」を数えるのに使う、負の値を持たない整数の型です。

`String` と `&str` はどちらも文字列ですが、扱いが違います。`String` は自分で中身を持つ文字列、`&str` は既にある文字列を参照するだけの型です。コード中の `"hello"` のような文字列リテラルは `&str` です。`String` として扱いたいときは `.to_string()` で変換します。`値.メソッド名()` の形は、その値に対して何か処理を行う書き方で、`.to_string()` は「文字列に変換する」処理です。

```rust
fn main() {
    let s: &str = "hello";
    let owned: String = s.to_string();
    println!("{}", owned);
}
```

`&` が「参照」を表す記号で、サンプルコードでも随所に出てきます。値そのものを渡す代わりに、その値を指す参照を渡すことで、コピーを作らずに中身を読めます。

> 📝 ここでは「`&` は中身を借りて読むための記号」と押さえれば十分です。その裏側にある所有権という仕組みを理解していなくても、初級は問題なく進められます。なぜ参照だとコピーせずに読めるのか気になったら「[所有権](../../concepts/ownership.md)」を読んでみてください。

## println! と eprintln! ― 出力する

`println!` は標準出力に文字列を出力します。`{}` の部分に変数の値が入ります。

```rust
fn main() {
    let name = "Alice";
    println!("Hello!");
    println!("名前: {}", name);
}
```

`eprintln!` は同じように出力しますが、出力先が標準エラー出力になります。エラーメッセージを出すときに使います。標準出力と標準エラー出力の違いは次のページで詳しく説明します。

```rust
fn main() {
    eprintln!("エラー: ファイルが見つかりません");
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

## Vec ― 複数の値をまとめる

同じ型の値を複数まとめて持つには `Vec` を使います。`Vec<String>` は「`String` を要素に持つ `Vec`」という意味です。初期値を並べて `Vec` を作るには `vec!` を使います。

```rust
fn main() {
    let names: Vec<String> = vec!["Alice".to_string(), "Bob".to_string()];
    println!("{}", names[0]);
    println!("{}", names[1]);
}
```

要素には `[インデックス]` でアクセスします。インデックスは 0 始まりです。サンプルコードでは、コマンドに渡された引数をこの `Vec<String>` として受け取っています。

## if ― 条件によって処理を分ける

条件によって処理を変えるには `if` を使います。

```rust
fn main() {
    let count = 1;
    if count < 2 {
        println!("引数が足りません");
    } else {
        println!("OK");
    }
}
```

`else` は省略できます。サンプルコードでは、渡された引数の数が足りているかをこの `if` で確認しています。
