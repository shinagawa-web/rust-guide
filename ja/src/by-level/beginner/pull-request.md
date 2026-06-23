# 変更内容をまとめる

実装が終わったので、今回の変更を振り返ります。

## 今回の変更を振り返る

変更したファイルは 3 つです。それぞれ何を変えたか確認します。

### models.rs

`User` に `created_at` フィールドを追加しました。既存データには作成日がない場合があるため、値がないことを表せる `Option<String>` を使っています。

```diff
 pub struct User {
     pub id: u32,
     pub name: String,
     pub email: String,
+    pub created_at: Option<String>,
 }
```

### main.rs

`db` の各ユーザーに `created_at: None` を追加しました。既存データには作成日がないため `None` にしています。

```diff
         User {
             id: 1,
             name: "Alice".to_string(),
             email: "alice@example.com".to_string(),
+            created_at: None,
         },
         User {
             id: 2,
             name: "Bob".to_string(),
             email: "bob@example.com".to_string(),
+            created_at: None,
         },
```

### handlers.rs（テストコード）

`app()` のユーザー初期化に `created_at: None` を追加しました。`User` にフィールドが増えたため、テスト内の初期化にも同じ対応が必要です。また `assert_json` の期待値にも `created_at` を追加しました。レスポンスに `created_at` が含まれるようになったため、期待値と一致させる必要があります。

```diff
             email: "alice@example.com".to_string(),
+            created_at: None,
         },
         ...
             email: "bob@example.com".to_string(),
+            created_at: None,
         },
```

```diff
-            { "id": 1, "name": "Alice", "email": "alice@example.com" },
-            { "id": 2, "name": "Bob",   "email": "bob@example.com"   }
+            { "id": 1, "name": "Alice", "email": "alice@example.com", "created_at": null },
+            { "id": 2, "name": "Bob",   "email": "bob@example.com",   "created_at": null }
```

## 変更内容を自分の言葉でまとめる

変更内容が整理できたら、PR を作成して説明文を書いてみてください。何を・なぜ・どう変えたかを自分の言葉で書くことで、理解できているかを確かめられます。

たとえばこのように書けます。

---

**概要**

`GET /users` と `GET /users/:id` のレスポンスに `created_at` を追加しました。

**変更内容**

- `models.rs` の `User` に `created_at: Option<String>` を追加
- `main.rs` の初期データに `created_at` を設定（既存ユーザーは `None`）
- テストの期待値を更新し、`created_at` があるケースのテストを追加

**動作確認**

```
$ curl http://localhost:3000/users/1
{"id":1,"name":"Alice","email":"alice@example.com","created_at":null}
```

---

