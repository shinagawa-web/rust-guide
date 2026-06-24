# 値がないかもしれないデータを扱う

前のページで読んだ `User` には `id`・`name`・`email` しかありません。次のページでは `created_at`（作成日時）を追加しますが、既存データには作成日がありません。値があるかないか、どちらの場合も扱える型が必要です。

Rust ではそのような場合に `Option<T>` を使います。

## Option の基本

`handlers.rs` で読んだ `Result` は「成功か失敗か」を型で表しました。`Option` は同じ仕組みで「値があるかないか」を表します。値は `Some(値)` か `None` のどちらかです。

```rust
// 値がある場合
let created_at: Option<String> = Some("2024-01-15".to_string());

// 値がない場合
let created_at: Option<String> = None;
```

`Option<String>` と書くことで、「文字列か、何もないかのどちらか」という型になります。

## if let ― 値を取り出す

`Option` の中の値を使うには、`Some` か `None` かを確認する必要があります。

`if let` を使うと、確認と取り出しを同時にできます。

```rust
fn main() {
    let created_at: Option<String> = Some("2024-01-15".to_string());

    if let Some(date) = created_at {
        println!("作成日: {}", date);
    } else {
        println!("作成日不明");
    }
}
```

`if let Some(変数) = Option の値` という形で書きます。`Some` だったとき、`{}` の中で変数を使えます。`None` だったときは `else` に進みます。

## 次のページへ

`Option` がわかれば、`User` に `created_at: Option<String>` を追加できます。既存データは `None`、新規で作成日を入れるデータは `Some("2024-01-15".to_string())` にすれば、同じ型で両方を扱えます。次のページで実際にフィールドを追加します。
