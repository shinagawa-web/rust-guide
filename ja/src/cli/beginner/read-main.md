# main.rs を読む

基本構文と CLI の仕組みがわかったので、実際にコードを読んでいきます。

## src/ の構成を確認する

プロジェクトのソースコードは `src/` ディレクトリにあります。

```text
src/
├── main.rs
└── counter.rs
```

2 つのファイルに分かれています。Rust のプログラムにはエントリポイント、つまり「ここから動き始める」という場所が決まっていて、それが `src/main.rs` です。まず `src/main.rs` を開きます。

## main.rs の全体像

開くとこのようなコードが並んでいます。

```rust
use std::env;
use std::fs;
use std::process;

mod counter;
use counter::Counter;

fn main() {
    let args: Vec<String> = env::args().collect();

    if args.len() < 2 {
        eprintln!("エラー: ファイル名の指定がありません");
        process::exit(1);
    }

    let filename = &args[1];

    let content = match fs::read_to_string(filename) {
        Ok(c) => c,
        Err(e) => {
            eprintln!("エラー: {}: {}", filename, e);
            process::exit(1);
        }
    };

    let result = Counter::count(&content);
    println!("lines: {}  chars: {}  bytes: {}", result.lines, result.chars, result.bytes);
}
```

短いですが、初めて見る書き方が混ざっています。上から順に読んでいきます。

## use と mod ― 必要なものを取り込む

```rust
use std::env;
use std::fs;
use std::process;
```

`std` は標準ライブラリです。Rust に最初から付いてくる機能のまとまりで、別途インストールは必要ありません。前のページで出てきた `std::env`（引数）や `std::process`（終了コード）はこの中にあります。`std::fs` はファイルを扱う機能です。

`use` は、これらをこのファイルで短く呼べるようにする宣言です。`use std::env;` と書いておくと、以降は `std::env::args()` を `env::args()` と書けます。

```rust
mod counter;
use counter::Counter;
```

`mod counter;` は「`src/counter.rs` をこのプロジェクトに含める」という宣言です。これがないと `counter.rs` はコンパイル対象になりません。続く `use counter::Counter;` で、`counter.rs` の中にある `Counter` をこのファイルで使えるようにしています。`Counter` が何かは次のページで読みます。

## 引数を受け取る

```rust
    let args: Vec<String> = env::args().collect();
```

前のページで見た通り、コマンドライン引数の一覧を `Vec<String>` として受け取っています。`args[0]` はプログラム自身の名前、`args[1]` が利用者の渡した最初の値です。

## 引数があるか確認する

```rust
    if args.len() < 2 {
        eprintln!("エラー: ファイル名の指定がありません");
        process::exit(1);
    }
```

`args.len()` は要素の個数を返します。ファイル名が渡されていれば `args` は `args[0]` と `args[1]` の 2 つ以上になります。逆に何も渡されないと要素は `args[0]` の 1 つだけで、`len()` は 1 です。

引数が渡されないまま `args[1]` を読むとプログラムが落ちてしまうので、その手前で要素数を確認しています。`args.len()` が `2` 未満、つまりファイル名が渡されていなければ、`eprintln!` でエラーを表示し、`process::exit(1)` で終了します。前のページで見たエラーの出し方と終了コードが、ここで実際に使われています。

## ファイル名を取り出す

```rust
    let filename = &args[1];
```

`args[1]` に入っているファイル名を `filename` という名前で扱えるようにしています。先頭の `&` は参照です。`args[1]` の文字列をコピーするのではなく、その場所を指し示すだけにしています。

## ファイルを読み込む ― match と Result

ここがこのファイルで一番大事な部分です。

```rust
    let content = match fs::read_to_string(filename) {
        Ok(c) => c,
        Err(e) => {
            eprintln!("エラー: {}: {}", filename, e);
            process::exit(1);
        }
    };
```

`fs::read_to_string(filename)` はファイルの中身を読み取ろうとする関数です。ただしファイルの読み込みは失敗することがあります。指定したファイルが無い、読む権限が無い、といったケースです。

Rust では、失敗するかもしれない処理の結果を `Result` という型で表します。`Result` は次の 2 つのどちらかになります。

- `Ok(中身)` ― 成功。`中身` に結果が入っている
- `Err(エラー)` ― 失敗。`エラー` に失敗の内容が入っている

成功と失敗が同じ 1 つの値にまとまっているので、必ずどちらかを処理してから先に進む形になります。この場合分けに使うのが `match` です。`match` は値がどのパターンに当てはまるかで処理を振り分けます。

```rust
        Ok(c) => c,
```

読み込みに成功したときは、中身を `c` という名前で受け取り、それをそのまま返します。返った中身が `content` に入ります。

```rust
        Err(e) => {
            eprintln!("エラー: {}: {}", filename, e);
            process::exit(1);
        }
```

失敗したときは、エラーの内容を `e` で受け取り、`eprintln!` でファイル名とエラー内容を表示してから `process::exit(1)` で終了します。ここで終了するので、失敗したときに `content` の先へ進むことはありません。

`match` 全体がひとつの値を返し、その値を `let content` で受け取っています。つまりこの 1 文は「ファイルを読み、成功すれば中身を `content` に入れ、失敗すればエラーを出して終了する」という意味になります。

## 数えて出力する

```rust
    let result = Counter::count(&content);
    println!("lines: {}  chars: {}  bytes: {}", result.lines, result.chars, result.bytes);
```

残りはこの2行です。読み込んだ中身を `Counter::count` に渡し、返ってきた結果を `result` として `println!` で表示しています。`cargo run` で最初に見た `lines: 3  chars: 16  bytes: 16` は、この出力です。

ただし、`Counter::count` が何を返すのか、`result.lines` のような書き方が何を取り出しているのかは、`Counter` の形を知らないと読めません。`Counter` は次のページの `counter.rs` で定義されています。`counter.rs` を読んでから、この2行に戻って改めて確認します。
