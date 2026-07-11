# handlers.rs を読む

前のページで `main.rs` のルーティングを確認しました。`http://localhost:3000/users` へリクエストが来ると `get_users` が、`http://localhost:3000/users/1` へリクエストが来ると `get_user` が呼ばれます。その 2 つの関数が `handlers.rs` に書かれています。

## handlers.rs の全体像

```rust
use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use crate::models::User;

pub async fn get_users(State(db): State<Vec<User>>) -> Json<Vec<User>> {
    Json(db)
}

pub async fn get_user(State(db): State<Vec<User>>, Path(id): Path<u32>) -> Result<Json<User>, StatusCode> {
    for user in &db {
        if user.id == id {
            return Ok(Json(user.clone()));
        }
    }
    Err(StatusCode::NOT_FOUND)
}
```

上から順に読んでいきます。

## pub ― 他のファイルから呼び出せる

```rust
pub async fn get_users(...) { ... }
pub async fn get_user(...) { ... }
```

`pub` は「このファイルの外からも使える」という印です。`main.rs` でこの 2 つの関数を `use handlers::{get_user, get_users};` で持ち込んでいました。`pub` をつけることで他のファイルから呼び出せるようになります。

## get_users を読む

```rust
pub async fn get_users(State(db): State<Vec<User>>) -> Json<Vec<User>> {
    Json(db)
}
```

引数の `State(db)` は `main.rs` で `.with_state(db)` に渡したユーザーデータです。それをそのまま `Json(db)` で包んで返しています。`Json(...)` で包むと axum が JSON 形式に変換してレスポンスとして返します。

`curl http://localhost:3000/users` を実行したときに Alice と Bob のリストが返ってきたのは、この 1 行のおかげです。

## get_user を読む

```rust
pub async fn get_user(State(db): State<Vec<User>>, Path(id): Path<u32>) -> Result<Json<User>, StatusCode> {
    for user in &db {
        if user.id == id {
            return Ok(Json(user.clone()));
        }
    }
    Err(StatusCode::NOT_FOUND)
}
```

`get_users` より複雑です。引数が 2 つあり、戻り値の型も違います。順番に読んでいきます。

`State(db)` は `get_users` と同じでユーザーデータです。`Path(id)` は URL の `:id` の部分の値です。`http://localhost:3000/users/1` へのリクエストなら `id` は `1` になります。`db` の中から `id` が `1` のユーザーを探すので、Alice が返ってきます。

## for と & ― 一件ずつ確認する

```rust
for user in &db {
    if user.id == id {
```

`for` と `if` は前のページで学んだものです。`for user in &db` は「`db` の中のユーザーを 1 件ずつ取り出して `user` と呼ぶ」という繰り返しで、`if user.id == id` で ID が一致するか確認しています。

ここで注目したいのが `&db` の `&` です。`db` のデータを読むだけで変更しないとき、`&` をつけて「借りる」形で渡します。`&` をつけずに `db` と書くとデータの所有権ごと移ってしまい、ループ後に `db` を使えなくなります。今は「読むだけのときは `&` をつける」と覚えておけば十分です。

> 📝 今は「読むだけのときは `&` をつける」で十分です。この裏側にある所有権という仕組みを理解していなくても、初級は問題なく進められます。「借りる」と「所有権ごと移る」が気になったら「[所有権](../../concepts/ownership.md)」を読んでみてください。

## return ― 途中で処理を終わらせる

```rust
return Ok(Json(user.clone()));
```

`return` は関数の途中で結果を返して処理を終わらせます。ID が一致したユーザーが見つかった時点でここに来て、残りのループを打ち切って返します。

`user.clone()` は `user` のコピーを作ります。`&` で借りているデータはそのまま返せないため、コピーして返しています。

`Ok(...)` は次の節で説明します。

## Result ― 成功か失敗か

`get_user` の戻り値の型を見てみます。

```rust
-> Result<Json<User>, StatusCode>
```

`Result` は「成功したか失敗したか」を型として表したものです。他の言語では失敗したとき例外を投げることが多いですが、Rust では `Result` を返すことで「この関数は失敗することがある」を型で明示します。

`Result<A, B>` の形で書き、`A` が成功時の型、`B` が失敗時の型です。値は `Ok` か `Err` のどちらかになります。

成功のときは `Ok(値)` で包んで返し、失敗のときは `Err(値)` で包んで返します。

```rust
fn divide(a: u32, b: u32) -> Result<u32, String> {
    if b == 0 {
        return Err("0 では割れません".to_string());
    }
    Ok(a / b)
}

fn main() {
    println!("{:?}", divide(10, 2));  // Ok(5)
    println!("{:?}", divide(10, 0));  // Err("0 では割れません")
}
```

`get_user` の場合を見てみます。

```rust
-> Result<Json<User>, StatusCode>
```

`Result<A, B>` の `A` が成功時の型、`B` が失敗時の型です。成功なら `Json<User>`（見つかったユーザー）、失敗なら `StatusCode`（HTTP ステータスコード）を返します。

ID が一致するユーザーが見つかれば `Ok(Json(user.clone()))` を返します。`db` を最後まで調べても見つからなければ `Err(StatusCode::NOT_FOUND)` を返します。`StatusCode::NOT_FOUND` は HTTP の 404 です。

`curl http://localhost:3000/users/99` を実行したときに `404` が返ってきたのはこの `Err` のおかげです。
