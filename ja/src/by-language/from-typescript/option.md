# null / undefined の代わりに Option

TypeScript で「値が無い」を表すものといえば `null` と `undefined` です。省略できるプロパティ、見つからなかったときの戻り値、まだ入っていない変数。いろいろな場面で出てきます。そして tsconfig で `strictNullChecks` を有効にしていれば、この「無いかもしれない」は型にも現れます。`number | undefined` のような型が付き、`undefined` の可能性を潰さないまま数値として使おうとすると、コンパイラが止めてくれます。

Rust の `Option` は、この延長線上にあります。「無いかもしれない」を一つの型ではっきり表し、中身を使う前に有無を確かめることをコンパイラが要求する、という発想は、strict モードの TypeScript とよく似ています。違うのは、`null` と `undefined` の二本立てではなく、`Option` 一つに集約されることです。この章では、名前からスコアを引く小さな例で、その違いを見ます。

## TypeScript の「無い」は型に出る（けれど抜け道もある）

名前からスコアを引く `Map` を考えます。登録されていない名前を引くと、`Map` は `undefined` を返します。

```ts
// TypeScript
const scores = new Map<string, number>([["blue", 10]]);

const v = scores.get("red"); // v の型は number | undefined
console.log(v);              // undefined
```

`get` の戻り値の型は `number` ではなく `number | undefined` です。この `v` をそのまま数値として使おうとすると、コンパイラが止めます。

```ts
// TypeScript
const scores = new Map<string, number>([["blue", 10]]);

const v = scores.get("red");
console.log(v + 1); // エラー：v は undefined かもしれない
```

`undefined` かどうかを先に確かめれば、その先では数値として扱えます。

```ts
// TypeScript
const scores = new Map<string, number>([["blue", 10]]);

const v = scores.get("blue");
if (v !== undefined) {
  console.log(v + 1); // 11（undefined でないと確かめたので、数として使える）
} else {
  console.log("未登録");
}
```

ここまで見た TypeScript のやり方は、次に見る Rust の `Option` とほとんど同じです。「無いかもしれない」を型に出し、確かめる前は使わせない。TypeScript 経験者にとって、Rust の `Option` は決して未知の概念ではありません。

## Rust では Option で表す

同じ `Map` を Rust でも用意して、キーで値を取り出してみます。`HashMap` の取り出しの戻り値は、値そのものではなく `Option` です。

```rust
// Rust
use std::collections::HashMap;

fn main() {
    let mut scores = HashMap::new();
    scores.insert("blue", 10);

    let v = scores.get("red"); // v の型は Option<&i32>
    println!("{v:?}");         // None
}
```

`get` が返す `Option<&i32>` は、次の二つのどちらかです。

- `Some(&10)`：値がある（登録されていた）
- `None`：値がない（未登録）

TypeScript の `number | undefined` と、役割はほとんど同じです。違うのは、「無い」を表すのが `undefined` という言語じゅうで使い回される値ではなく、`None` という `Option` 専用の形になっていることです。そして `v` は数値そのものではないので、`number | undefined` を絞り込まずには使えなかったのと同じように、`Some` か `None` かを確かめる前は数として使えません。

```rust
// Rust
# use std::collections::HashMap;
fn main() {
    let mut scores = HashMap::new();
    scores.insert("blue", 10);

    let v = scores.get("red");
    println!("{}", v + 1); // コンパイルエラー：Option は i32 のように足せない
}
```

TypeScript でも、`number | undefined` はそのまま足せませんでした。Rust の `Option` もそれと同じで、`Some` か `None` かを先に確かめない限り、中の数値には触れません。`undefined` の可能性を潰してから使う、というあの習慣が、Rust ではすべての `Option` に対して常に求められる、と考えると近いです。

## 中身を取り出す

`Option` から中の値を取り出す方法は、目的に応じていくつかあります。TypeScript で `undefined` を扱ってきたときのやり方に、だいたい一対一で対応します。

一番基本は `match` です。`Some` と `None` を分けて処理する形で、さきほど TypeScript で書いた `if (v !== undefined) { } else { }` にそのまま対応します。

```rust
// Rust
# use std::collections::HashMap;
fn main() {
    let mut scores = HashMap::new();
    scores.insert("blue", 10);

    match scores.get("red") {
        Some(v) => println!("{v}"),
        None => println!("未登録"),
    }
}
```

`None` の側を書かないとコンパイルが通らないので、「無い場合」の考慮漏れが起きません。TypeScript の `if (v !== undefined)` は `else` を省いても動きましたが、`match` は両方の枝をそろえるまで通りません。

値があるときだけ何かしたいなら、`if let` が短く書けます。TypeScript の `if (v !== undefined) { ... }` にあたる形です。

```rust
// Rust
# use std::collections::HashMap;
# fn main() {
# let mut scores = HashMap::new();
# scores.insert("blue", 10);
if let Some(v) = scores.get("blue") {
    println!("{v}");
}
# }
```

無いときに既定値で進めたいなら `unwrap_or` を使います。TypeScript の `??`（nullish coalescing）とほぼ同じ役割で、`Some` ならその中身を、`None` なら渡した既定値を返します。

```ts
// TypeScript
const v = scores.get("red") ?? 0; // 未登録なら 0
```

```rust
// Rust
# use std::collections::HashMap;
# fn main() {
# let mut scores = HashMap::new();
# scores.insert("blue", 10);
let v = scores.get("red").copied().unwrap_or(0); // 未登録なら 0
println!("{v}");
# }
```

`get` は値そのものではなく参照 `Option<&i32>` を返すので、間に挟んだ `copied()` で中の数値を取り出してから、既定値の `0` とそろえています。

値があるときだけ変換して、無ければ無いままにしたいなら `map` を使います。TypeScript の `?.`（optional chaining）に近く、`Some` なら中身に処理を適用して `Some` のまま返し、`None` なら何もせず `None` を返します。

```ts
// TypeScript
const label = scores.get("blue")?.toString(); // string | undefined
```

```rust
// Rust
# use std::collections::HashMap;
# fn main() {
# let mut scores = HashMap::new();
# scores.insert("blue", 10);
let label = scores.get("blue").map(|v| v.to_string()); // Option<String>
println!("{label:?}"); // Some("10")
# }
```

最後に `unwrap()` は、確認を省いて中身をそのまま取り出します。ただし `None` のときは panic してその場で止まります。「ここは絶対にあるはず」と言い切れる場面に限る最終手段です。TypeScript の `!`（non-null assertion）で `scores.get("blue")!` と書くのに似ています。ただし `!` が黙って通してしまうのに対し、`unwrap` は外したときに実行を止めます。`unwrap` という名前もコードに残るので、どこで確認を飛ばしたかが読めば分かります。

```rust
// Rust
# use std::collections::HashMap;
# fn main() {
# let mut scores = HashMap::new();
# scores.insert("blue", 10);
let v = scores.get("blue").unwrap(); // "blue" はあるので 10。未登録の名前だと panic
println!("{v}");
# }
```

## `?` の話は、エラー処理でする

`Option` にも `?` はあり、`Some` なら中身を取り出して先へ進み、`None` ならその場で `None` を返して関数を抜けます。ただしこの短縮が効いてくるのは、失敗を次々に上へ伝えていくエラー処理のほうです。次の章で扱う `Result` と合わせて、そこで改めて見ます。

「無いかもしれない」を扱う `Option` と、「失敗したかもしれない」を扱う `Result` は、Rust では同じ発想で作られた、よく似た形の型です。ここまでの `match` / `if let` / `unwrap_or` は、そのまま `Result` にも通じます。次はその `Result` を見ます。
