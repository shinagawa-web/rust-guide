# テキストを受け取って返す

前のページで、初級の差分を計算するコードをエッジのハンドラに差し込みました。ただし比べる2つのテキストは、`I have a cat.` と `I have a dog.` をコードに直接書いたままでした。これだと、呼ぶ側はいつも同じ差分しか受け取れません。

このページでは、リクエストで送られてきた2つのテキストを受け取り、その差分を返すようにします。送る側が比べたいテキストを選べるようになり、ここでようやく差分ツールが呼んで使える形になります。

## 受け取る形と返す形を決める

まず、送る側と受け取る側のあいだで、テキストをどんな形でやり取りするかを決めます。ここでは JSON を使います。

```json
{"a": "I have a cat.", "b": "I have a dog."}
```

比べたい2つのテキストに `a` と `b` という名前をつけて、ひとまとめにして送ります。JSON にしておくと、curl からもブラウザからも素直に送れて、受け取った側も名前を頼りに値を取り出せます。返す差分も、同じく JSON にします。

```json
{"diff": "I have a [-cat-][+dog+]."}
```

Rust の側では、この送られてくる形と返す形を、それぞれ `struct` として書いておきます。

```rust
#[derive(Deserialize)]
struct DiffRequest {
    a: String,
    b: String,
}

#[derive(Serialize)]
struct DiffResponse {
    diff: String,
}
```

`DiffRequest` が受け取る形、`DiffResponse` が返す形です。フィールドの名前（`a`、`b`、`diff`）が、そのまま JSON のキーになります。

先頭の `#[derive(...)]` は、その `struct` と JSON を行き来する変換を自動で用意してもらう指定です。名前が似ていますが、向きが逆の2つを、受け取る側と返す側で使い分けています。

| 指定 | 変換の向き | つける `struct` |
| --- | --- | --- |
| `Deserialize` | JSON → `struct` | 受け取る `DiffRequest` |
| `Serialize` | `struct` → JSON | 返す `DiffResponse` |

この変換を担うのが serde です。Rust の値を JSON のような形式に変換したり、その逆に戻したりする役目を引き受けるライブラリで、名前も serialize と deserialize をつなげたものです。使うには `Cargo.toml` に一行足します。

```toml
[dependencies]
worker = "0.8"
serde = { version = "1", features = ["derive"] }
```

`features = ["derive"]` が、いま書いた `#[derive(Deserialize)]` のような指定を使えるようにする部分です。

## ハンドラを書き換える

形が決まったので、ハンドラを書き換えます。前のページではこうなっていました。

```rust
use worker::*;

mod diff;

#[event(fetch)]
async fn fetch(_req: Request, _env: Env, _ctx: Context) -> Result<Response> {
    let a = "I have a cat.";
    let b = "I have a dog.";
    Response::ok(diff::diff(a, b))
}
```

これを、リクエストからテキストを読み取って返すように変えます。

```rust
use worker::*;
use serde::{Deserialize, Serialize};

mod diff;

#[derive(Deserialize)]
struct DiffRequest {
    a: String,
    b: String,
}

#[derive(Serialize)]
struct DiffResponse {
    diff: String,
}

#[event(fetch)]
async fn fetch(mut req: Request, _env: Env, _ctx: Context) -> Result<Response> {
    let input: DiffRequest = req.json().await?;
    let result = diff::diff(&input.a, &input.b);
    Response::from_json(&DiffResponse { diff: result })
}
```

ハンドラの中でやっていることは3つです。

`req.json().await?` で、リクエストの本文に入っている JSON を読み取り、さきほど決めた `DiffRequest` の形に組み立てます。どの形に組み立てるかは、左辺の `input: DiffRequest` という型で指定しています。組み立てた結果は `input` に入り、`input.a` と `input.b` で送られてきた2つのテキストを取り出せます。関数の頭の `_req` が `mut req` に変わったのは、本文を読み取るとリクエストの中身が消費されて状態が変わるからです。書き換えられる形で受け取っておく必要があります。末尾の `?` は、読み取りがうまくいかなかったときに、そこで中断してエラーをそのまま返す印です。いまは正しい JSON が送られてくる前提で進めます。

`diff::diff(&input.a, &input.b)` は前のページと同じで、2つのテキストの差分を計算します。渡すテキストが、コードに直接書いた文字列から、送られてきた `input.a` と `input.b` に変わりました。`input.a` と `input.b` は `String` なので、`&` をつけて渡しています。

`Response::from_json(&DiffResponse { diff: result })` で、計算した差分を `DiffResponse` に入れ、JSON にして返します。前のページの `Response::ok(...)` は文字列をそのまま返すものでしたが、`from_json` は `struct` を JSON に変換したうえで、これは JSON だという印もつけて返します。呼ぶ側は、返ってきたものをそのまま JSON として扱えます。

## 手元で動かして確かめる

書き換えたら、手元で動かします。サンプルのフォルダで `wrangler dev` を起動します。`Cargo.toml` に serde を足したので、最初の起動では取り込みに少し時間がかかります。

```sh
$ wrangler dev
```

起動したら、別のターミナルから、比べたい2つのテキストを JSON にして送ります。

```sh
$ curl -X POST http://localhost:8787 \
    -H 'content-type: application/json' \
    -d '{"a": "I have a cat.", "b": "I have a dog."}'
```

返ってくるのはこの JSON です。

```json
{"diff":"I have a [-cat-][+dog+]."}
```

送った `a` と `b` の差分が、`diff` という名前のついた JSON で返ってきました。前のページはコードに書いた `cat` と `dog` で決め打ちでしたが、今度は送った内容がそのまま結果に出ています。別のテキストを送れば、その差分が返ります。日本語でも同じです。

```sh
$ curl -X POST http://localhost:8787 \
    -H 'content-type: application/json' \
    -d '{"a": "猫が好き", "b": "犬が好き"}'
```

```json
{"diff":"[-猫-][+犬+]が好き"}
```

初級で文字化けを直した、文字ごとに差分を取るコードがそのまま効いていて、日本語でも1文字だけの違いをきちんと拾えています。

これで、送られてきたテキストを受け取り、その差分を JSON で返せるようになりました。呼ぶ側が比べたいものを選べる、HTTP エンドポイントらしい形です。

ただし、いまうまくいくのは、正しい JSON がきちんと送られてきたときだけです。本文が JSON になっていなかったり、`a` や `b` が入っていなかったり、そもそも POST ではなく GET で呼び出されたりすると、いまのハンドラはエラーを返すだけで、何が悪かったのかは呼ぶ側に伝わりません。次のページでは、こうした失敗に対して、理由の分かる返し方をしていきます。
