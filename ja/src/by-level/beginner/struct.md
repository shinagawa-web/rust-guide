# struct を読む

## struct とは

複数のデータをひとまとめにして扱うための仕組みです。

たとえばユーザーには ID・名前・メールアドレスがあります。これらをバラバラに管理すると、関数に渡すたびに 3 つの引数を並べることになります。`struct` を使うと「ユーザー」という単位でひとかたまりにできます。

## User を読む

`models.rs` を開くと `User` がこう定義されています。

```rust
pub struct User {
    pub id: u32,
    pub name: String,
    pub email: String,
}
```

`struct User { ... }` で `User` という名前の構造体を定義しています。`{` の中にフィールドを並べ、それぞれ `フィールド名: 型` の形で書きます。

型は次の通りです。

| フィールド | 型 | 意味 |
|---|---|---|
| `id` | `u32` | 符号なし 32 ビット整数。0 以上の整数 |
| `name` | `String` | 文字列 |
| `email` | `String` | 文字列 |

`pub` がついているのは前のページで説明した通り、他のファイルから使えるようにするためです。

## `#[derive]` とは

`User` の定義の直前に `#[derive(Clone, Serialize)]` があります。

```rust
#[derive(Clone, Serialize)]
pub struct User {
    ...
}
```

`#[derive(...)]` は、指定した機能を自動で実装する仕組みです。手で書かなくていい決まりきったコードを、コンパイラが生成してくれます。

`Clone` と `Serialize` それぞれが何をするかは次の通りです。

| 指定 | 意味 |
|---|---|
| `Clone` | `.clone()` でこの struct をコピーできるようにする |
| `Serialize` | serde というライブラリが JSON に変換できるようにする |

`created_at` フィールドを追加するとき、`#[derive]` はそのままで構いません。フィールドを増やしても `Clone` と `Serialize` は自動で追加分を含めて動いてくれます。
