# TypeScript から Rust へ

TypeScript を書いてきた人に向けた入口です。Rust の基礎を一から並べるのではなく、TypeScript と同じ書き方で通じるところは一気に流し、そうはいかないところにページを割きます。すでに知っている TypeScript を土台にして、Rust で違うところだけを覚えていく、という進め方です。

## この構成について

TypeScript 経験者にとって、Rust の多くは実は馴染みのあるものです。変数、条件分岐やループ、関数、オブジェクトや配列やマップ。書き方こそ違え、考え方は TypeScript とほとんど同じです。ここを一から丁寧に説明されても、退屈なだけで得るものは多くありません。

一方で、TypeScript と同じようには書けないところがいくつかあります。

- ランタイムに GC が無く、所有権でメモリを管理する
- `null` も `undefined` も無く、Option で「無いかもしれない」を表す
- 失敗は `throw` ではなく Result という型と `?` で返し、型の上に必ず現れる
- 共通の振る舞いを、構造的な型ではなく trait で表す
- 種類の違う値をまとめるのに、union 型ではなくデータを持つ enum を使う

ここが、TypeScript から来た人がつまずきやすく、同時に Rust を Rust たらしめているところです。

だからこのセクションは、二段構えにします。

- 前半で、TypeScript とほぼそのまま通じるものを一気に確認します。「TypeScript のこれは Rust のこれ」という対応で流し、細かい違いだけを拾います。
- 後半で、TypeScript と同じようには書けないところを、一つずつじっくり見ます。「TypeScript ではこう、Rust ではこう、なぜそうなっているのか」を軸に、つまずきやすい順で並べます。

後半の先頭には所有権を置きます。借用もエラー処理も trait も、その上に乗っているので、ここを最初に固めておくと、あとが速くなります。

## 章立て

TypeScript とほぼそのまま通じるもの

1. [TypeScript とほぼ同じところ](from-typescript/basics.md) — 変数・制御フロー・関数・構造体・Vec / HashMap

TypeScript と同じようには書けないところ

2. [所有権と借用](from-typescript/ownership.md) — GC の代わりに、コンパイル時にメモリを管理する
3. [null / undefined の代わりに Option](from-typescript/option.md) — 「無いかもしれない」を型で表す
4. [エラーの扱い](from-typescript/result.md) — `throw` / `try-catch` から、Rust の Result と `?` へ
5. [構造的な型の代わりに trait](from-typescript/trait.md) — 共通の振る舞いを表す
6. [union 型の代わりに enum と match](from-typescript/enum.md) — 種類の違う値を型で分ける
7. [並行性](from-typescript/concurrency.md) — シングルスレッドの async と似て非なるところ

最後に

- [TypeScript から Rust へ、ここまで](from-typescript/wrap-up.md) — 見てきた違いを振り返る
