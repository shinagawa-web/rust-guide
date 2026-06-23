# models.rs を読む

`handlers.rs` では `get_users` も `get_user` も `User` というデータを使っていました。この `User` がどんな情報を持っているかは `models.rs` に書かれています。

## models.rs を開く

`models.rs` を開くと、こう書かれています。

```rust
#[derive(Clone, Serialize)]
pub struct User {
    pub id: u32,
    pub name: String,
    pub email: String,
}
```

`struct` は複数のデータをひとまとめにする仕組みです。`User` には `id`・`name`・`email` の 3 つが入っています。

型は次の通りです。

| フィールド | 型 | 意味 |
|---|---|---|
| `id` | `u32` | 符号なし 32 ビット整数。0 以上の整数 |
| `name` | `String` | 文字列 |
| `email` | `String` | 文字列 |

`pub` がついているのは前のページで説明した通り、他のファイルから使えるようにするためです。

## `#[derive]` とは

`User` の定義の直前に `#[derive(Clone, Serialize)]` があります。

<!-- gomarklint-disable duplicate-heading -->

```rust
#[derive(Clone, Serialize)]
pub struct User {
    ...
}
```

<!-- gomarklint-enable duplicate-heading -->

`#[derive(...)]` は、指定した機能を自動で実装する仕組みです。手で書かなくていい決まりきったコードを、コンパイラが生成してくれます。

`Clone` と `Serialize` それぞれが何をするかは次の通りです。

| 指定 | 意味 |
|---|---|
| `Clone` | `.clone()` でこの struct をコピーできるようにする |
| `Serialize` | serde というライブラリが JSON に変換できるようにする |

`created_at` フィールドを追加するとき、`#[derive]` はそのままで構いません。フィールドを増やしても `Clone` と `Serialize` は自動で追加分を含めて動いてくれます。
