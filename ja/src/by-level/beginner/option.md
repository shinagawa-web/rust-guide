# 値がないかもしれないデータを扱う

前のページで読んだ `User` には `id`・`name`・`email` しかありません。次のページでは `created_at`（作成日時）フィールドを追加しますが、既存データには作成日がありません。他の言語なら `null` を使うところですが、Rust に `null` はありません。

Rust では「値があるかないか」を `Option<T>` という型で表します。

## Option の基本

`handlers.rs` で読んだ `Result` は「成功か失敗か」を型で表しました。`Option` は同じ仕組みで「値があるかないか」を表します。値は `Some(値)` か `None` のどちらかです。

```rust
// 値がある場合
let created_at: Option<String> = Some("2024-01-15".to_string());

// 値がない場合
let created_at: Option<String> = None;
```

`Option<String>` と書くことで、「文字列か、何もないかのどちらか」という型になります。

## 値を取り出す

`Option` の中の値を使うには、`Some` か `None` かを確認する必要があります。`if let` を使うと簡潔に書けます。

```rust
if let Some(date) = created_at {
    println!("作成日: {}", date);
} else {
    println!("作成日不明");
}
```

`Some` なら `date` に値が取り出され、`None` なら `else` に進みます。`match` でも書けますが、この用途は `if let` が最もシンプルです。

## 次のページへ

`Option` がわかれば、`User` に `created_at: Option<String>` を追加できます。既存データは `None`、新規で作成日を入れるデータは `Some("2024-01-15".to_string())` にすれば、同じ型で両方を扱えます。次のページで実際にフィールドを追加します。
