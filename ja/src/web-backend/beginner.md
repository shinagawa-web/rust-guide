# 初級

Rust が全くわからない状態で現場に入ることになった。そんなとき、このガイドで学んだことがあれば最初の 1 週間をなんとか乗り切れる、かもしれません。

Rust の文法を網羅的に学ぶのではなく、実際の good first issue を一つ解く過程で必要な知識だけを順番に積み上げます。このガイドを終えると、issue の変更を実装して PR を作成し、何をどう変えたかを自分の言葉で説明できるようになります。

題材は axum を使った Web サーバーです。他言語で Web 開発をしたことがあれば馴染みやすいですが、なくても読み進められます。

解くのはこの issue です。

---

`GET /users/:id` のレスポンスに `created_at` を追加する

現在のレスポンス：

```json
{ "id": 1, "name": "Alice", "email": "alice@example.com" }
```

変更後：

```json
{ "id": 1, "name": "Alice", "email": "alice@example.com", "created_at": "2026-01-15T09:30:00Z" }
```

条件：

- 既存レコードには `created_at` がない場合があるので注意
- 壊れるテストを修正して `cargo test` が通ること

---

## このガイドの進め方

以下の順で進みます。

1. [プロジェクトを動かす](beginner/cargo.md) ― 環境を整えて、サーバーを起動する
2. [Rust の基本構文](beginner/basics.md) ― 最低限の書き方だけ先に確認する
3. [main.rs を読む](beginner/read-main.md) ― どのファイルに何が書かれているかを把握する
4. [handlers.rs を読む](beginner/read-handlers.md) ― リクエストを受けて返す処理を読む
5. [models.rs を読む](beginner/read-models.md) ― ユーザーデータの定義を読む
6. [値がないかもしれないデータを扱う](beginner/option.md) ― `created_at` に使う `Option` の読み方を覚える
7. [`created_at` を追加する](beginner/add-field.md) ― 実際に `created_at` を `User` に追加する
8. [テストを直す](beginner/fix-test.md) ― 壊れたテストを修正して `cargo test` を通す
9. [変更内容をまとめる](beginner/pull-request.md) ― PR を作成して何をどう変えたかを自分の言葉で書く
10. [まとめ](beginner/summary.md) ― 理解できたことを振り返る

## このガイドで学ぶこと

自分で書けるようになること

- `cargo build` / `cargo run` / `cargo test`
- 変数（`let`, `mut`）と基本的なデータ型
- 関数（`fn`、引数、戻り値）
- 制御フロー（`if/else`, `for`）
- `struct` の定義・フィールドの追加
- `#[derive]` をフィールド追加に合わせて使う
- `Option` を使う（`None` / `Some`）
- 壊れたテストを修正する

読めれば十分なこと

- `mod` / `pub` / `use`（コードを辿れる程度）
- `&` と `&mut` の意味（コンパイルエラーを読むために）
- `String` と `&str` の違い
- `match` と `?` 演算子の読み方

## このガイドで扱わないこと

Rust には学ぶことが多くありますが、このガイドでは扱いません。

- `async` / `await`（コード中に出てきますが、今は読み飛ばして構いません）
- トレイトの定義・ジェネリクス・ライフタイム注釈
- クロージャ・イテレータ
- `enum` を自分で定義する
- マクロ・`unsafe`

これらは中級以降のガイドで扱います。
