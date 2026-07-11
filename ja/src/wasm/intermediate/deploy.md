# デプロイして公開する

前のページまでで、差分ツールは手元で動く HTTP エンドポイントとして整いました。ただし動いているのは自分のパソコンの中だけで、呼び出せるのも同じパソコンからに限られます。このページでは、これを Cloudflare のエッジに載せて、世界のどこからでも呼び出せる公開の URL にします。

ここまではずっと `wrangler dev` で手元のランタイムを使ってきました。あれは本物のエッジと同じものを手元で立ち上げていただけで、外からは見えません。今度は同じコードを Cloudflare 側へ送り、世界中の拠点に配ってもらいます。送るのに使うのは、これまでと同じ wrangler です。

## Cloudflare にログインする

エッジにコードを送るには、Cloudflare のアカウントが要ります。まだ持っていなければ、[Cloudflare のサインアップページ](https://dash.cloudflare.com/sign-up) から作れます。この差分ツールくらいの使い方なら、無料の範囲に収まります。

アカウントを用意したら、wrangler にそのアカウントを教えます。

```sh
$ wrangler login
```

ブラウザが開いて、Cloudflare の認可画面が出ます。wrangler に操作を許してよいかを尋ねられるので、許可します。これで、手元の wrangler がそのアカウントとしてエッジを操作できるようになります。一度ログインすれば、次からはこの手順は要りません。

## デプロイする

準備ができたら、いよいよ公開します。使うのは `deploy` です。

```sh
$ wrangler deploy
```

`wrangler dev` のときと同じように、まず Rust が wasm に変換され、そのあとでエッジへ送られます。はじめてデプロイするときは、途中で公開用のサブドメイン名を尋ねられます。ここで決めた名前が、このあとの URL の `<あなたのサブドメイン>` になります。一度決めれば、次からは聞かれません。

送り終わると、こんな出力が返ります。

```text
...（ビルドの出力は省略）
Total Upload: 405.65 KiB / gzip: 155.75 KiB
Uploaded textdiff-worker (1.34 sec)
Deployed textdiff-worker triggers (1.49 sec)
  https://textdiff-worker.<あなたのサブドメイン>.workers.dev
```

最後に出た `https://textdiff-worker.<あなたのサブドメイン>.workers.dev` が、公開された URL です。`<あなたのサブドメイン>` には、さきほど決めた自分の名前が入ります。この URL の向こうで、いま送った差分ツールが動いています。

この先で自分の URL を使うので、最後に出た `workers.dev` の URL を控えておいてください。

## 公開された URL を呼ぶ

さっそく、公開された URL を呼んでみます。これまで `http://localhost:8787` に送っていた curl の宛先を、いま控えた自分の URL に変えるだけです。

```sh
$ curl -X POST https://textdiff-worker.<あなたのサブドメイン>.workers.dev/ \
    -H 'content-type: application/json' \
    -d '{"a": "I have a cat.", "b": "I have a dog."}'
```

```json
{"diff":"I have a [-cat-][+dog+]."}
```

手元で動かしていたときとまったく同じ差分が返ってきました。違うのは、応えているのが自分のパソコンではなく、Cloudflare のエッジだという点だけです。日本語でも同じように動きます。

```sh
$ curl -X POST https://textdiff-worker.<あなたのサブドメイン>.workers.dev/ \
    -H 'content-type: application/json' \
    -d '{"a": "私は猫を飼っている。", "b": "私は犬を飼っている。"}'
```

```json
{"diff":"私は[-猫-][+犬+]を飼っている。"}
```

## ブラウザから呼ぶ

curl で呼べたので、最後にブラウザから呼んでみます。前のページで、ブラウザからの呼び出しを許すヘッダを付けておきました。あの許可のヘッダが、ここで効きます。

2つの入力欄とボタンだけの、小さな HTML のページを作ります。ボタンを押すと、入力欄のテキストを公開した URL へ送り、返ってきた差分を下に表示します。次の内容を `client.html` として保存してください。

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <title>テキスト差分</title>
</head>
<body>
  <textarea id="a" rows="3" cols="40">I have a cat.</textarea>
  <textarea id="b" rows="3" cols="40">I have a dog.</textarea>
  <button id="run">差分を取る</button>
  <pre id="result"></pre>

  <script>
    const endpoint = "https://textdiff-worker.<あなたのサブドメイン>.workers.dev/";

    document.getElementById("run").addEventListener("click", async () => {
      const a = document.getElementById("a").value;
      const b = document.getElementById("b").value;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ a, b }),
      });

      const data = await res.json();
      document.getElementById("result").textContent = data.diff;
    });
  </script>
</body>
</html>
```

`endpoint` に書いてある URL を、自分の公開した URL に書き換えてください。ここが curl のときの宛先にあたります。あとは、ボタンが押されたら入力欄の値を読んで、`fetch` でその URL へ POST します。送る中身は curl のときと同じで、2つのテキストを JSON にしたものです。返ってきた JSON から差分を取り出して、画面に表示します。

保存したら、ブラウザでこのファイルを開きます。入力欄はあらかじめ `I have a cat.` と `I have a dog.` が入れてあるので、そのまま「差分を取る」を押すと、下に `I have a [-cat-][+dog+].` と表示されます。curl で受け取っていたものと同じ差分が、今度はブラウザの画面に出ました。

入力欄のテキストを書き換えて押せば、そのたびに新しい差分が返ります。ブラウザに打ち込んだテキストが、自分で公開したエッジの差分ツールを通って、差分になって戻ってくる。初級ではブラウザの中だけで完結していた差分の計算が、いまはブラウザの外の、自分で世界に公開した場所で動いています。

## ここまでで作ったもの

初級で手を入れた差分の計算を、同じ Rust のまま Cloudflare のエッジに載せ、誰でも呼び出せる URL として公開しました。JSON でテキストを受け取り、差分を JSON で返し、おかしな呼び方には理由の分かる番号で応え、ブラウザからの呼び出しにも備える。手元で動かして育てたものを、そのまま世界に開くところまで来ました。

次のページでは、この中級でたどってきた道のりをふりかえります。
