# main.rs を読む

基本的な構文がわかったので、実際にコードを読んでいきます。

## src/ の構成を確認する

プロジェクトのソースコードは `src/` ディレクトリにあります。

```
src/
├── main.rs
├── handlers.rs
└── models.rs
```

3 つのファイルに分かれています。Rust のプログラムはエントリポイント、つまり「ここから動き始める」という場所が決まっていて、それが `src/main.rs` です。まず `src/main.rs` を開きます。

## main.rs の全体像

開くとこのようなコードが並んでいます。

```rust
mod handlers;
mod models;

use axum::{routing::get, Router};
use handlers::{get_user, get_users};
use models::User;

#[tokio::main]
async fn main() {
    let db = vec![
        User { id: 1, name: "Alice".to_string(), email: "alice@example.com".to_string() },
        User { id: 2, name: "Bob".to_string(),   email: "bob@example.com".to_string() },
    ];

    let app = Router::new()
        .route("/users", get(get_users))
        .route("/users/:id", get(get_user))
        .with_state(db);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    println!("Listening on http://localhost:3000");
    axum::serve(listener, app).await.unwrap();
}
```

上から順に読んでいきます。

## mod ― 他のファイルを読み込む

```rust
mod handlers;
mod models;
```

`mod handlers;` は「`src/handlers.rs` をこのプロジェクトに含める」という宣言です。これがないと `handlers.rs` はコンパイル対象になりません。`mod models;` も同様です。

`src/` に 3 つのファイルがありましたが、`main.rs` にこの 2 行があることで 3 ファイルがひとつのプログラムとしてつながります。

## use ― 使うものを持ち込む

```rust
use axum::{routing::get, Router};
use handlers::{get_user, get_users};
use models::User;
```

`mod` で読み込んだファイルや外部ライブラリのものを、このファイルで使えるようにするのが `use` です。`use models::User;` なら「`models` の `User` をここで使う」という意味になります。

`use handlers::{get_user, get_users}` のように `{}` でまとめて複数を持ち込むこともできます。

## main() を読む

```rust
#[tokio::main]
async fn main() {
```

`fn main()` は前のページで学んだ関数の定義で、プログラムはここから動き始めます。`#[tokio::main]` と `async` は非同期処理のための記述です。axum を使うときに必要になりますが、今は読み飛ばして構いません。

まず `let` でユーザーデータを用意します。

```rust
    let db = vec![
        User { id: 1, name: "Alice".to_string(), email: "alice@example.com".to_string() },
        User { id: 2, name: "Bob".to_string(),   email: "bob@example.com".to_string() },
    ];
```

`let` と `vec!` は前のページで学んだものです。`User { ... }` は struct の値を作る書き方で、次のページで詳しく説明します。`.to_string()` で文字列リテラルを `String` に変換しているのも前のページの通りです。

次にルーティングを設定します。

```rust
    let app = Router::new()
        .route("/users", get(get_users))
        .route("/users/:id", get(get_user))
        .with_state(db);
```

`Router` は「この URL へのアクセスはこの関数で処理する」という対応を管理するものです。`.route()` で URL と関数を 1 対 1 で登録しています。`http://localhost:3000/users` にリクエストが来ると `get_users` が呼ばれ、`http://localhost:3000/users/1` にリクエストが来ると `get_user` が呼ばれます。

`.with_state(db)` は `db` を各関数に渡しています。`cargo run` で起動してから `curl http://localhost:3000/users` を叩いたときに Alice と Bob のデータが返ってきたのは、`db` がここから各関数に届いているためです。

最後にサーバーを起動します。

```rust
    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    println!("Listening on http://localhost:3000");
    axum::serve(listener, app).await.unwrap();
```

ポート 3000 で待ち受けを開始して `axum::serve` でサーバーを動かします。`cargo run` したときに `Listening on http://localhost:3000` と表示されたのはこの `println!` です。
