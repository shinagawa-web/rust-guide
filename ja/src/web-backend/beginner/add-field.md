# `created_at` を追加する

`Option` の使い方がわかったので、実際に `User` へ `created_at` を追加します。`models.rs` に 1 行足すだけですが、他のファイルにも影響が出ます。順番に直していきます。

## models.rs を編集する

`models.rs` を開いて、`email` の下に 1 行追加します。

```rust
#[derive(Clone, Serialize)]
pub struct User {
    pub id: u32,
    pub name: String,
    pub email: String,
    pub created_at: Option<String>,
}
```

## cargo build でエラーを確認する

保存して `cargo build` を実行します。

```text
error[E0063]: missing field `created_at` in initializer of `User`
  --> src/main.rs:11:9
   |
11 |         User {
   |         ^^^^ missing `created_at`

error[E0063]: missing field `created_at` in initializer of `User`
  --> src/main.rs:16:9
   |
16 |         User {
   |         ^^^^ missing `created_at`
```

`main.rs` の `User` の初期化に `created_at` が足りないというエラーです。エラーメッセージにファイルと行番号が表示されているので、そこを開きます。

## main.rs を直す

`main.rs` の `db` の初期化に `created_at` を追加します。Alice と Bob は既存データなので `None`、新しく Carol を `Some(...)` で追加します。

```rust
let db = vec![
    User {
        id: 1,
        name: "Alice".to_string(),
        email: "alice@example.com".to_string(),
        created_at: None,
    },
    User {
        id: 2,
        name: "Bob".to_string(),
        email: "bob@example.com".to_string(),
        created_at: None,
    },
    User {
        id: 3,
        name: "Carol".to_string(),
        email: "carol@example.com".to_string(),
        created_at: Some("2026-01-15T09:30:00Z".to_string()),
    },
];
```

## 動作を確認する

`cargo run` でサーバーを起動して curl で確認します。

既存ユーザーは `created_at` が `null` です。

```sh
$ curl http://localhost:3000/users/1
{"id":1,"name":"Alice","email":"alice@example.com","created_at":null}
```

新しく追加した Carol は値が入っています。

```sh
$ curl http://localhost:3000/users/3
{"id":3,"name":"Carol","email":"carol@example.com","created_at":"2026-01-15T09:30:00Z"}
```

## cargo test を実行する

続けて `cargo test` を実行します。

```text
error[E0063]: missing field `created_at` in initializer of `models::User`
  --> src/handlers.rs:30:13
   |
30 |             User {
   |             ^^^^ missing `created_at`

error[E0063]: missing field `created_at` in initializer of `models::User`
  --> src/handlers.rs:35:13
   |
35 |             User {
   |             ^^^^ missing `created_at`
```

テストのコードにも `User` の初期化があり、同じエラーが出ます。次のページで直します。
