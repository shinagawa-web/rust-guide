# テストを直す

前のページで `cargo test` を実行するとエラーが出ました。`handlers.rs` の中にテストコードがあり、そこにも `User` の初期化があるためです。

## エラーを読む

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

`src/handlers.rs` の 30 行目と 35 行目と書かれています。`handlers.rs` を開いてその周辺を確認します。

## handlers.rs のテストコードを直す

`handlers.rs` の末尾にテストコードがあります。`app()` 関数の中の `User` 初期化に `created_at: None` を追加します。

```rust
fn app() -> Router {
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
    ...
}
```

## assert_json を直す

コンパイルエラーが解消しても、テストはまだ失敗します。`test_get_users` と `test_get_user` で期待するレスポンスに `created_at` が含まれていないためです。

`cargo test` を実行して確認します。

```text
failures:
    handlers::tests::test_get_user
    handlers::tests::test_get_users

---- handlers::tests::test_get_user stdout ----
thread 'handlers::tests::test_get_user' panicked at src/handlers.rs:68:18:
assertion failed: `(left == right)`

Diff < left / right > :
 Object {
>    "created_at": Null,
     "email": String("alice@example.com"),
     "id": Number(1),
     "name": String("Alice"),
 }
```

実際のレスポンスには `created_at` が含まれているのに、テストの期待値には含まれていません。`assert_json` を直します。

<!-- gomarklint-disable duplicate-heading -->

```rust
#[tokio::test]
async fn test_get_users() {
    let server = TestServer::new(app()).unwrap();
    let response = server.get("/users").await;

    response.assert_status_ok();
    response.assert_json(&json!([
        { "id": 1, "name": "Alice", "email": "alice@example.com", "created_at": null },
        { "id": 2, "name": "Bob",   "email": "bob@example.com",   "created_at": null },
        { "id": 3, "name": "Carol", "email": "carol@example.com", "created_at": "2026-01-15T09:30:00Z" }
    ]));
}

#[tokio::test]
async fn test_get_user() {
    let server = TestServer::new(app()).unwrap();
    let response = server.get("/users/1").await;

    response.assert_status_ok();
    response.assert_json(&json!(
        { "id": 1, "name": "Alice", "email": "alice@example.com", "created_at": null }
    ));
}

#[tokio::test]
async fn test_get_user_with_created_at() {
    let server = TestServer::new(app()).unwrap();
    let response = server.get("/users/3").await;

    response.assert_status_ok();
    response.assert_json(&json!(
        { "id": 3, "name": "Carol", "email": "carol@example.com", "created_at": "2026-01-15T09:30:00Z" }
    ));
}
```

## cargo test を通す

`cargo test` を実行して全テストが通ることを確認します。

```text
$ cargo test
running 4 tests
test handlers::tests::test_get_user_not_found ... ok
test handlers::tests::test_get_user ... ok
test handlers::tests::test_get_user_with_created_at ... ok
test handlers::tests::test_get_users ... ok

test result: ok. 4 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

<!-- gomarklint-enable duplicate-heading -->

実装はここで完了です。次のページでは、今回どこを・なぜ・どう変えたかを自分の言葉でまとめます。
