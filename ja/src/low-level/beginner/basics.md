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

サンプルコードでは、文字列を 1 文字ずつ組み立てていく変数を `let mut` で作っています。

## 基本的な型

変数には型があります。Rust は型推論があるので多くの場合は省略できますが、場合によっては明示が必要です。

サンプルコードに出てくる型は次の 3 つです。

| 型 | 意味 |
|---|---|
| `u32` | 符号なし 32 ビット整数。0 以上の整数。パーミッションの整数を扱う |
| `char` | 1 文字 |
| `String` | 文字列 |

パーミッションの整数 `mode` は `u32` で扱います。種別を表す先頭の 1 文字は `char`、組み立てた 10 文字全体は `String` です。

`&` が「参照」を表す記号で、サンプルコードでも随所に出てきます。値そのものを渡す代わりに、その値を指す参照を渡すことで、コピーを作らずに中身を読めます。

```rust
fn main() {
    let args = vec!["prog".to_string(), "script.sh".to_string()];
    let path = &args[1];
    println!("{}", path);
}
```

`&args[1]` は、`args` の中の文字列を取り出して所有するのではなく、参照して見るだけ、という意味です。

## println! と eprintln! ― 出力する

`println!` は標準出力に文字列を出力します。`{}` の部分に変数の値が入ります。

```rust
fn main() {
    let name = "Alice";
    println!("Hello!");
    println!("名前: {}", name);
}
```

`eprintln!` は同じように出力しますが、出力先が標準エラー出力になります。エラーメッセージを出すときに使います。

```rust
fn main() {
    eprintln!("エラー: パスの指定がありません");
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

サンプルコードでは、整数を受け取って `char` や `String` を返す小さな関数に処理を分けています。

## Vec ― 複数の値をまとめる

同じ型の値を複数まとめて持つには `Vec` を使います。`Vec<String>` は「`String` を要素に持つ `Vec`」という意味です。

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

## match ― パターンで分ける

値が取りうるパターンごとに処理を分けるには `match` を使います。

```rust
fn main() {
    let result: Result<i32, String> = Ok(7);
    match result {
        Ok(n) => println!("成功: {}", n),
        Err(e) => println!("失敗: {}", e),
    }
}
```

`Result` は成功（`Ok`）か失敗（`Err`）のどちらかを表す型です。`match` はそのすべてのパターンを書く必要があり、成功なら中身を取り出し、失敗なら別の処理をします。サンプルコードでは、ファイルの情報取得が成功したか失敗したかをこの `match` で分けています。

## mod ― ファイルを分ける

コードを複数のファイルに分けるには `mod` で読み込みます。`mod perm;` と書くと、`src/perm.rs` の中身が `perm` というモジュールとして使えるようになります。中の関数は `perm::format_mode` のように呼び出します。

モジュールの中身はデフォルトでは外から見えません。外部から呼べるようにするには `pub` をつけます。

```rust
pub fn format_mode(mode: u32) -> String {
    // ...
}
```

サンプルコードでは、`main.rs` から呼ぶ `format_mode` には `pub` を付け、`perm.rs` の中だけで使う関数には付けずにモジュールの内側に閉じています。

これで、サンプルコードに出てくる構文はひととおり押さえました。ただし `perm.rs` には、パーミッションの整数（`mode`）から所有者・グループ・その他の権限を取り出す処理が出てきます。これは構文を知っているだけでは読めません。次のページでは、その仕組み――パーミッションの数字の読み方を見ていきます。
