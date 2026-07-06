# Rust と JavaScript の境界を読む

サンプルコードを読む前に、この初級編の中心にあるしくみを先に押さえておきます。

この差分ツールの中心にあるのが、`diff` という関数です。2つの文章を受け取り、消えた部分と増えた部分を囲み記号で示した文字列を返します。`src/lib.rs` に Rust で書かれていて、これをブラウザの JavaScript から呼び出して、画面に差分を表示しています。

この章で見るのは、その呼び出しの境目です。1章では、この受け渡しの境目を境界と呼びました。`diff` が中で何をしているかは次の章で読みます。ここで見るのは、`diff` がブラウザの JavaScript からどう呼ばれるか、という配線の部分だけです。

## #[wasm_bindgen] ― 関数を境界の向こうに出す

`diff` 関数の定義は、`src/lib.rs` の中でこう始まっています。

```rust
#[wasm_bindgen]
pub fn diff(a: &str, b: &str) -> String {
    ...
}
```

`diff` の上に付いた `#[wasm_bindgen]` が、この初級編の主役です。これは「この関数を境界の向こう、つまり JavaScript から呼べるようにする」という目印です。すぐ下の `pub` は基本構文で見たとおりです。

`#[wasm_bindgen]` が付いていないと、その関数は wasm の内部の関数どまりで、JavaScript から呼ぶための手がかりがありません。付けておくと、あとで出てくる橋渡しの JavaScript が、この関数に合わせて自動で用意されます。

この目印が付いているのは `diff` だけです。差分を組み立てる内部の関数には付いていません。JavaScript から呼べるようにするのは入口の1つだけにして、中の細かい関数はファイルの中に隠しておく、という分け方です。

## 3つの層 ― main.js・橋渡し・lib.rs

`diff` の呼び出しは、3つのファイルを順に通っていきます。呼ぶ側から並べると、こうです。

```text
main.js           ← 自分で書く、画面まわりの JavaScript
pkg/textdiff.js   ← wasm-pack が自動で作った橋渡し
src/lib.rs        ← Rust。diff 関数の本体
```

出発点は `main.js` です。これは自分で書くファイルで、その先頭で、橋渡しから `diff` を読み込んでいます。

```js
import init, { diff } from "./pkg/textdiff.js";
```

`init` は wasm 本体を読み込むための関数、`diff` がさっきの Rust の関数です。使う前に一度 `init()` を呼んで wasm を読み込んでおき、そのあとは `diff` を呼ぶだけです。

```js
async function main() {
  await init();
  // ...
  const marked = diff(a.value, b.value);
}
```

`a.value` と `b.value` は入力欄に打ち込まれた文字列です。実際には入力欄が変わるたびに呼ばれますが、呼び出しそのものはこの1行で、2つの文字列を渡すと、囲み記号の付いた差分の文字列が返ってきます。`main.js` から見ると、これはただの関数呼び出しで、この裏で Rust のコードが動いているとは、書き方の上では見えません。

それを見えなくしているのが、呼び出しが次に通る `pkg/textdiff.js` です。次に、その中を開きます。

## 橋渡しの正体 ― 数値はそのまま、文字列にはひと手間

その `pkg/textdiff.js` を開くと、`main.js` が呼んでいた `diff` の実体があります。要点だけ取り出すと、こうです。

```js
export function diff(a, b) {
    const ptr0 = passStringToWasm0(a, ...);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(b, ...);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.diff(ptr0, len0, ptr1, len1);
    return getStringFromWasm0(ret[0], ret[1]);
}
```

これは手で書いたものではなく、2章の `wasm-pack build` で、`#[wasm_bindgen]` を目印に自動で生成された関数です。ここで `diff` という名前が2つ出てきます。いま見ているこの `diff` は JavaScript 側の入口です。その中ほどの `wasm.diff(ptr0, len0, ptr1, len1)` が、この章のはじめに見た `#[wasm_bindgen] pub fn diff`、つまり `src/lib.rs` に Rust で書かれた `diff` を wasm にしたものを呼ぶところです。生成されたこの `diff` がしているのは1つで、文字列を wasm に渡せる形に置き換えてから、その Rust の `diff` を呼んでいます。

1章で、境界をまたぐとき、数値はそのまま渡せるが、文字列にはひと手間が要る、と書きました。そのひと手間が、この関数の中で起きています。

wasm の関数がそのまま受け取れるのは、実は数値だけです。数値ならそのまま渡せます。ですが JavaScript の文字列は、そのまま渡すことができません。JavaScript と wasm は、同じ文字列を共有しているわけではないからです。

そこで `passStringToWasm0` が、渡された文字列を UTF-8 のバイトの並びにして、wasm 側のメモリに書き込みます。そのうえで、書き込んだ位置（`ptr`）と長さ（`len`）を wasm の `diff` に渡します。この2つはどちらも数値です。つまり、wasm に実際に渡っているのは数値だけで、文字列そのものは渡っていません。返ってきた結果も、位置と長さで受け取り、`getStringFromWasm0` で文字列に組み立て直しています。

この置き換えを、自分で書く必要はありません。`#[wasm_bindgen]` を付けておくと、橋渡しがこの手間ごと生成してくれます。ひと手間が要るのは確かですが、その手間は道具が肩代わりしてくれる、というのがここの要点です。

## 境界を渡ったあと

ここで1つ、次の章の読みどころにつながる点があります。いま見たとおり、JavaScript の文字列は UTF-8 のまま wasm に渡り、Rust 側では欠けのない `&str` として `diff` が受け取ります。日本語の文章も、この境界を渡る時点では壊れていません。

つまり、このツールが日本語で差分を崩すとしても、その原因は境界の受け渡しにはありません。原因は、境界を渡ってきた文字列を、`diff` の中でどう扱っているかのほうにあります。次はいよいよその中身、`src/lib.rs` を読んでいきます。
