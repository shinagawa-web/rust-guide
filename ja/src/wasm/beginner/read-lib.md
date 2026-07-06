# lib.rs を読む

4章で、`diff` がブラウザの JavaScript から呼ばれ、2つの文字列が Rust 側に届くところまで見ました。ここでは `src/lib.rs` を開いて、届いた文字列を `diff` が中でどう扱っているかを読みます。ファイルは短く、処理は大きく2つの仕事に分かれています。

## 全体の流れ ― 入力・差分の並び・文字列

入口の `diff` は、それ自体は数行です。

```rust
#[wasm_bindgen]
pub fn diff(a: &str, b: &str) -> String {
    let ops = build_diff(a.as_bytes(), b.as_bytes());
    render(&ops)
}
```

`diff` は、データを3つの段階に通します。`diff("I have a cat.", "I have a dog.")` を例に、各段階で何が渡っているかを見ます。

1つめは、入力の2つの文字列です。`a` が `"I have a cat."`、`b` が `"I have a dog."`。

2つめは、`build_diff` の戻り値 `ops` です。2つを1バイトずつ見比べて、それぞれに「共通・消えた・増えた」の印を付けて並べたものです。`I have a ` の部分はすべて共通で、違いのある `cat` と `dog` のところは次のようになります。

```text
消えた c / 消えた a / 消えた t / 増えた d / 増えた o / 増えた g / 共通 .
```

3つめは、`render` の戻り値、つまり `diff` が返す最終的な文字列です。`ops` の同じ印が続くところをまとめ、消えた部分に `[-` と `-]`、増えた部分に `[+` と `+]` を付けます。

```text
I have a [-cat-][+dog+].
```

消えた `c` `a` `t` がまとまって `[-cat-]`、増えた `d` `o` `g` が `[+dog+]`、共通部分はそのまま残ります。この `[-…-]` と `[+…+]` が囲み記号です。差分の計算そのものは `build_diff`、見た目を作るのが `render`、という分担です。

この印が1バイトごとなのには理由があります。`build_diff` に渡しているのは `a` や `b` ではなく、`a.as_bytes()` と `b.as_bytes()` です。`as_bytes()` は、文字列をバイトの並びとして取り出すもので、これ以降の計算は文字ではなくバイトの単位で進みます。英語のような半角の文字は1文字が1バイトなので問題になりませんが、この「バイト単位」が、6章で日本語を直すときの手がかりになります。

## 差分の1要素を表す型 ― Kind と Op

`build_diff` が作る差分の並びは、次の型でできています。

```rust
#[derive(PartialEq)]
enum Kind {
    Eq,
    Del,
    Add,
}

struct Op {
    kind: Kind,
    byte: u8,
}
```

`Kind` は、差分の1要素が「共通（`Eq`）」「消えた（`Del`）」「増えた（`Add`）」のどれかを表す `enum` です。`Op` は、その種類（`kind`）と、対象の1バイト（`byte`）をひとまとめにした `struct` です。どちらも3章で見た書き方です。`Op` が差分の1要素で、`build_diff` はこの `Op` を並べた `Vec<Op>` を返します。

型の上に付いた `#[derive(PartialEq)]` は、`Kind` どうしを `==` で比べられるようにする指定です。あとで、同じ種類が続いているかを判定するのに使います。

ここでも `byte: u8`、つまり1要素が持つのは1バイトです。

## build_diff ― 共通部分を見つけて差分を組み立てる

`build_diff` は2段階で動きます。前半は、2つの並びの共通部分を調べる準備です。

```rust
fn build_diff(a: &[u8], b: &[u8]) -> Vec<Op> {
    let n = a.len();
    let m = b.len();
    let w = m + 1;

    let mut dp = vec![0u32; (n + 1) * w];
    for i in (0..n).rev() {
        for j in (0..m).rev() {
            dp[i * w + j] = if a[i] == b[j] {
                dp[(i + 1) * w + (j + 1)] + 1
            } else {
                dp[(i + 1) * w + j].max(dp[i * w + (j + 1)])
            };
        }
    }
```

前半がしているのは、2つの並びの最長共通部分列（LCS）、つまり両方に同じ順で現れる、いちばん長い共通部分を調べることです。`dp` はそのための表で、後ろから順に埋めています。ここは中の数式まで追わなくて大丈夫です。この表を先に用意しておくと、次のたどり直しで、各要素を共通・消えた・増えた のどれにするかを決められます。

後半は、その表を見ながら `a` と `b` を先頭から一緒にたどり、`Op` を1つずつ組み立てます。

```rust
    let mut ops = Vec::new();
    let (mut i, mut j) = (0, 0);
    while i < n && j < m {
        if a[i] == b[j] {
            ops.push(Op { kind: Kind::Eq, byte: a[i] });
            i += 1;
            j += 1;
        } else if dp[(i + 1) * w + j] >= dp[i * w + (j + 1)] {
            ops.push(Op { kind: Kind::Del, byte: a[i] });
            i += 1;
        } else {
            ops.push(Op { kind: Kind::Add, byte: b[j] });
            j += 1;
        }
    }
    while i < n {
        ops.push(Op { kind: Kind::Del, byte: a[i] });
        i += 1;
    }
    while j < m {
        ops.push(Op { kind: Kind::Add, byte: b[j] });
        j += 1;
    }
    ops
}
```

`a[i]` と `b[j]` が同じなら、そこは共通なので `Eq` の `Op` を積み、両方を1つ進めます。違うときは、前半の表を見て、`a` 側を消えた（`Del`）とみなすか、`b` 側を増えた（`Add`）とみなすかを決め、進んだほうだけを1つ進めます。片方が先に終わって残った分は、残りの2つの `while` で `Del` か `Add` として積みます。こうしてできた `Op` の並びが `build_diff` の答えです。

## render ― 囲み記号を付けて文字列にする

`render` は、`Op` の並びを最終的な1つの文字列にします。

```rust
fn render(ops: &[Op]) -> String {
    let mut out = String::new();
    let mut i = 0;
    while i < ops.len() {
        let kind = &ops[i].kind;
        let mut bytes = Vec::new();
        while i < ops.len() && &ops[i].kind == kind {
            bytes.push(ops[i].byte);
            i += 1;
        }
        let text = String::from_utf8_lossy(&bytes);
        match kind {
            Kind::Eq => out.push_str(&text),
            Kind::Del => {
                out.push_str("[-");
                out.push_str(&text);
                out.push_str("-]");
            }
            Kind::Add => {
                out.push_str("[+");
                out.push_str(&text);
                out.push_str("+]");
            }
        }
    }
    out
}
```

同じ種類が続くところを、内側の `while` でひとまとめにしています。まとめているのは `byte`、つまりバイトです。集めたバイトを `String::from_utf8_lossy` で文字列に戻し、種類ごとに `match` で振り分けて、消えた部分には `[-` と `-]`、増えた部分には `[+` と `+]` を付けます。共通部分はそのまま出します。`match` と `==` で種類を見分けるところが、さきほど `#[derive(PartialEq)]` を付けた理由です。

## 通して見ると ― すべてバイト単位で動いている

読み通すと、`diff` は `build_diff` で差分の並びを作り、`render` で文字列に直す、という2段構成でした。そして入口の `as_bytes()` から、`Op` が持つ `byte`、`render` がまとめる `bytes` まで、処理はひとつながりにバイトの単位で進んでいます。

英語のような半角の文字は1文字が1バイトなので、これで正しく差分が取れます。ですが日本語は1文字が複数のバイトでできています。バイトの単位で切ったり比べたりすると、1文字の途中で切れてしまうことがあります。次の章では、この「バイト単位」を「文字単位」に直して、日本語でも差分が正しく取れるようにします。
