# main.rs を読む

前のページで、`fs::metadata` から `mode` を取り出すところまで見ました。部品はそろったので、このページでは `main.rs` を最初から最後まで通して読み、全体がどうつながっているかを確認します。

`main.rs` の全体はこうなっています。

```rust
use std::env;
use std::fs;
use std::os::unix::fs::PermissionsExt;
use std::process;

mod perm;

fn main() {
    let args: Vec<String> = env::args().collect();

    if args.len() < 2 {
        eprintln!("エラー: パスの指定がありません");
        process::exit(1);
    }

    let path = &args[1];

    let metadata = match fs::metadata(path) {
        Ok(m) => m,
        Err(e) => {
            eprintln!("エラー: {}: {}", path, e);
            process::exit(1);
        }
    };

    let mode = metadata.permissions().mode();
    println!("{}  {}", perm::format_mode(mode), path);
}
```

先頭の `use` は、このあと使う標準ライブラリの機能を読み込むものです。`mod perm;` は、もう一つのファイル `perm.rs` を読み込んでいます（中身は次のページで読みます）。では `main` の中を上から見ていきます。

## 引数を受け取る

```rust
let args: Vec<String> = env::args().collect();

if args.len() < 2 {
    eprintln!("エラー: パスの指定がありません");
    process::exit(1);
}

let path = &args[1];
```

`env::args()` は、コマンドに渡された引数を順に返します。`collect()` でそれを `Vec<String>` にまとめています。`args[0]` はプログラム自身の名前で、`args[1]` が利用者の渡したパスです。

引数が足りない（`args.len()` が 2 未満）なら、パスが渡されていないということなので、メッセージを出して終了します。問題なければ、`path` に `args[1]` を借りて受け取ります。

## メタデータから mode を取り出す

```rust
let metadata = match fs::metadata(path) {
    Ok(m) => m,
    Err(e) => {
        eprintln!("エラー: {}: {}", path, e);
        process::exit(1);
    }
};

let mode = metadata.permissions().mode();
```

ここは前のページで詳しく読んだところです。`fs::metadata` で OS からファイルの情報を取り、成功なら `permissions().mode()` でパーミッションの整数 `mode` を取り出します。失敗すればエラーを出して終了します。

## 結果を表示する

```rust
println!("{}  {}", perm::format_mode(mode), path);
```

最後の 1 行で結果を表示します。`perm::format_mode(mode)` が、`mode` を `-rwxr-xr-x` の 10 文字に直して返します。それとパス（`path`）を並べて出力しているのが、1 ページ目で最初に見た `-rwxr-xr-x  sample/script.sh` です。

ここで呼んでいる `format_mode` は `perm.rs` にあります。次のページでは、その `perm.rs` を読んでいきます。
