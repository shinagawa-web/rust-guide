# 失敗をちゃんと返す

前のページで、送られてきたテキストの差分を JSON で返せるようになりました。ただし、うまくいくのは正しい JSON が POST で送られてきたときだけです。本文が JSON になっていなかったり、GET で叩かれたりすると、いまのハンドラはエラーを返すだけで、何が悪かったのかは呼ぶ側に届きません。

このページでは、そうした失敗に、理由の分かる形で応えるようにします。あわせて、ブラウザの中の HTML から呼び出せるようにもします。ここまで整えば、公開して誰かに叩かれても、きちんと受け答えできる HTTP エンドポイントになります。

## メソッドを POST に絞る

この差分ツールは、本文に2つのテキストを載せて POST で送ってもらう前提です。GET のように本文のないリクエストで呼ばれても、比べるものがありません。まずは、POST 以外で呼ばれたら、そうと分かる形で断るようにします。

ハンドラの先頭で、リクエストのメソッドを見て振り分けます。

```rust
match req.method() {
    Method::Post => {}
    _ => return Response::error("Method Not Allowed", 405),
}
```

`req.method()` は、そのリクエストが GET なのか POST なのかを表します。POST のときは `{}` で何もせず、そのまま先へ進みます。それ以外のときは、`Response::error` でエラーを返してハンドラを抜けます。`Response::error("Method Not Allowed", 405)` は、`405` という状態コードと、`Method Not Allowed` というメッセージを持ったレスポンスです。`405` は、その方法では受け付けないことを表す HTTP の決まった番号で、呼ぶ側はこの番号を見れば、送り方が違うと分かります。

## 壊れた入力を 400 で返す

次は、本文が正しい JSON でなかったときです。前のページでは、こう書いていました。

```rust
let input: DiffRequest = req.json().await?;
```

末尾の `?` は、読み取りに失敗したらそこで中断してエラーを返す印でした。ただこのままだと、返るのは中身の分からないエラーで、呼ぶ側には何が悪かったのかが伝わりません。ここを、失敗を自分で受け止めて、`400` を返すように書き換えます。

```rust
let input: DiffRequest = match req.json().await {
    Ok(value) => value,
    Err(_) => return Response::error("Bad Request", 400),
};
```

`req.json().await` の結果を `match` で二手に分けています。読み取れたときは `Ok(value)` に入るので、その中身を `input` に取り出します。失敗したときは `Err(_)` に入るので、`400` のエラーを返してハンドラを抜けます。`Err(_)` の `_` は、受け取った失敗の中身は今回使わないという印です。`400` は、送られてきた内容がおかしいことを表す番号です。`?` に任せて素通しにしていたところを、自分で受け止めて、意味のある番号に変えました。

## ブラウザから呼べるようにする

ここまでは curl で呼んできました。次のページでは、ブラウザで開いた HTML の入力欄からこの差分ツールを呼びます。ところが、ブラウザには curl にはない制限があります。あるページから、別のドメインにあるエンドポイントを呼び出したとき、その結果を、ブラウザは既定ではページに渡しません。よそのサイトのデータを勝手に読み取られないようにするための、ブラウザ側の安全策です。

呼び出される側が、このページからの読み取りを許すと書いたヘッダを返せば、ブラウザは結果をページに渡します。この許可を伝えるのが、`Access-Control-` で始まるヘッダです。

この差分ツールのように、本文を `application/json` として送る呼び出しでは、ブラウザは本番のリクエストを送る前に、`OPTIONS` という下見のリクエストを送り、この方法で呼んでいいかを先に確かめます。だから、この `OPTIONS` にも許可を返して答える必要があります。

これらのヘッダは、成功のときも、さきほどの 405・400 のときも、同じように付けたいものです。同じ3行を何度も書かずに済むよう、レスポンスにヘッダを付けて返す小さな関数にまとめます。

```rust
fn with_cors(mut res: Response) -> Result<Response> {
    let headers = res.headers_mut();
    headers.set("Access-Control-Allow-Origin", "*")?;
    headers.set("Access-Control-Allow-Methods", "POST, OPTIONS")?;
    headers.set("Access-Control-Allow-Headers", "Content-Type")?;
    Ok(res)
}
```

`with_cors` は、受け取ったレスポンスに3つのヘッダを足して返します。`res.headers_mut()` で、そのレスポンスのヘッダを書き換えられる形で取り出し、`set` で1つずつ加えています。`set` の末尾の `?` は、設定に失敗したらそこで中断する印で、これまでと同じ使い方です。`Access-Control-Allow-Origin` の値の `*` は、どのページからの呼び出しも許すという意味です。ほかの2つは、どのメソッドと、どのヘッダを使った呼び出しを許すかを伝えるもので、さきほどの `OPTIONS` の下見への答えになります。

あとは、レスポンスを返している各所を、この `with_cors` を通してから返すようにします。書き換えたハンドラ全体はこうなります。

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

fn with_cors(mut res: Response) -> Result<Response> {
    let headers = res.headers_mut();
    headers.set("Access-Control-Allow-Origin", "*")?;
    headers.set("Access-Control-Allow-Methods", "POST, OPTIONS")?;
    headers.set("Access-Control-Allow-Headers", "Content-Type")?;
    Ok(res)
}

#[event(fetch)]
async fn fetch(mut req: Request, _env: Env, _ctx: Context) -> Result<Response> {
    match req.method() {
        Method::Options => return with_cors(Response::empty()?),
        Method::Post => {}
        _ => return with_cors(Response::error("Method Not Allowed", 405)?),
    }

    let input: DiffRequest = match req.json().await {
        Ok(value) => value,
        Err(_) => return with_cors(Response::error("Bad Request", 400)?),
    };

    let result = diff::diff(&input.a, &input.b);
    with_cors(Response::from_json(&DiffResponse { diff: result })?)
}
```

先頭の `match` に `Method::Options` の分岐が増えました。下見のリクエストには、`Response::empty()` で作った中身のない空のレスポンスに、`with_cors` でヘッダだけ付けて答えます。POST の本処理を抜けた最後の行も、成功のレスポンスを `with_cors` を通して返しています。405 と 400 のエラーも同じように通しているので、どんな結果でも、ブラウザに必要なヘッダが付いて返ります。

エラーを返す行に `?` が付いたのは、`with_cors` を通す都合です。`Response::error(...)` が返すのは `Result` なので、`?` でその中身のレスポンスを取り出してから、`with_cors` に渡しています。

## 手元で動かして確かめる

書き換えたら、手元で動かして、失敗のときの応えを確かめます。`wrangler dev` を起動しておき、まず GET で叩いてみます。状態コードも見たいので、`curl` に `-i` を付けます。

```sh
$ curl -i http://localhost:8787
```

```text
HTTP/1.1 405 Method Not Allowed
Access-Control-Allow-Origin: *
Access-Control-Allow-Headers: Content-Type
Access-Control-Allow-Methods: POST, OPTIONS
...（ほかのヘッダは省略）
Method Not Allowed
```

POST でないので、`405` が返りました。前は中身の分からないエラーでしたが、今度は送り方が違うと番号で分かります。`with_cors` で付けた `Access-Control-` の3つのヘッダも、ちゃんと乗っています。次に、壊れた本文を POST してみます。

```sh
$ curl -i -X POST http://localhost:8787 -d 'not json'
```

```text
HTTP/1.1 400 Bad Request
Access-Control-Allow-Origin: *
...（ほかのヘッダは省略）
Bad Request
```

JSON として読み取れなかったので、`400` が返りました。このエラーにも、さきほどと同じ `Access-Control-` のヘッダが付いています。正しく呼んだときは、これまでどおり差分が返り、やはり同じヘッダが付きます。

```sh
$ curl -i -X POST http://localhost:8787 \
    -H 'content-type: application/json' \
    -d '{"a": "I have a cat.", "b": "I have a dog."}'
```

```text
HTTP/1.1 200 OK
Access-Control-Allow-Origin: *
...（ほかのヘッダは省略）
{"diff":"I have a [-cat-][+dog+]."}
```

正しく呼ばれたときは差分を返し、間違った呼び方には理由の分かる番号を返し、ブラウザからの呼び出しにも備えられました。手元で動く HTTP エンドポイントとして、ひととおり整いました。

残るは、これを自分の手元から、世界のどこからでも叩ける公開の URL に載せることです。次のページで、いよいよデプロイして公開します。
