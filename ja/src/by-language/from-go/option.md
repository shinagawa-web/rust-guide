# nil の代わりに Option

Go で「値が無い」を表す方法はいくつもあります。ポインタやマップ、スライス、インターフェースの `nil`。数値や文字列の `0` や `""` といったゼロ値。マップ取り出しの `v, ok := m[k]` の `ok`。どれも日常的に使いますが、共通するのは、型の上では「無いかもしれない」が見えないことです。確かめるかどうかは書く側しだいで、忘れてもコンパイルは通ります。

Rust に `nil` はありません。代わりに「無いかもしれない」を `Option` という型ではっきり表し、中身を使う前に有無を確かめることを、コンパイラが要求します。この章では、名前からスコアを引く小さな例を Go と Rust の両方で並べ、あいまいな「無い」が Rust でどう一つの型に集約されるかを見ます。

## Go では「無い」が型に現れない

名前からスコアを引くマップを考えます。登録されていない名前を引くと、Go はゼロ値を返します。

```go
// Go
scores := map[string]int{"blue": 10}

v := scores["red"] // 未登録でも 0 が返る
fmt.Println(v)     // 0
```

返ってきた `0` が「スコアが 0 だった」のか「そもそも登録が無い」のかは、この戻り値だけでは区別できません。区別するには、二つ目の戻り値 `ok` を受け取ります。

```go
// Go
scores := map[string]int{"blue": 10}

if v, ok := scores["red"]; ok {
    fmt.Println(v)
} else {
    fmt.Println("未登録")
}
```

ただし `v, ok := ...` と書くか `scores["red"]` で済ますかは、書く側しだいです。`ok` を受け取り忘れても、コンパイルは通ります。`nil` のポインタも同じで、使う前に `nil` を確かめるかどうかは書く側の注意力に委ねられています。「無いかもしれない」ことも、それを確かめたかどうかも、型には現れません。

## Rust では「無いかもしれない」が型に出る（Option）

同じマップを Rust で引いてみます。取り出しの戻り値は、値そのものではなく `Option` です。

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

- `Some(&10)` — 値がある（登録されていた）
- `None` — 値がない（未登録）

Go のゼロ値と違い、未登録は `0` ではなく `None` になります。「登録が無い」と「スコアが 0」が混ざりません。そして `v` は数値そのものではないので、いきなり数として使うことはできません。

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

Go では未登録でも `0` が返り、そのまま計算に混ざりました。Rust は、`Some` か `None` かを先に確かめない限り、中の数値に触らせません。この確認は任意ではなく、省くとコンパイルエラーになります。

## 中身を取り出す

`Option` から中の値を取り出す方法は、目的に応じていくつかあります。

一番基本は `match` です。`Some` と `None` を分けて処理する形で、さきほどの Go の `if v, ok := ...; ok { } else { }` にそのまま対応します。

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

`None` の側を書かないとコンパイルが通らないので、「無い場合」の考慮漏れが起きません。Go の `if ok` は書き忘れても通りましたが、こちらは書き漏らせない形です。

値があるときだけ処理したいなら、`if let` が短く書けます。

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

`unwrap()` や `expect()` は、確認を省いて中身をそのまま取り出します。ただし `None` のときは panic します。「ここは絶対にあるはず」と言い切れる場面に限る最終手段で、Go で `nil` を確かめずに触って panic するのに近いですが、Rust では `unwrap` という名前がコードに残るので、どこで確認を飛ばしたかが読めば分かります。

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

無いときに panic させず、既定値で進めたいなら `unwrap_or` を使います。`unwrap` の、`None` のときに既定値を返す版です。Go でゼロ値をそのまま既定値に使っていたのを、明示的に書く形です。

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

## 確かめる手間を減らす — `?` と `map`

`Option` を確かめるたびに `match` を書くと、コードが縦に伸びます。よく使う短縮形を二つ挙げます。

`Option` を返す関数の中でなら、`?` が使えます。`Some` なら中身を取り出して先へ進み、`None` ならその場で `None` を返して関数を抜けます。

```rust
// Rust
use std::collections::HashMap;

fn doubled(scores: &HashMap<&str, i32>, name: &str) -> Option<i32> {
    let v = scores.get(name)?; // 未登録なら、ここで None を返す
    Some(v * 2)
}

fn main() {
    let mut scores = HashMap::new();
    scores.insert("blue", 10);

    println!("{:?}", doubled(&scores, "blue")); // Some(20)
    println!("{:?}", doubled(&scores, "red"));  // None
}
```

中身だけを変換したいなら、`map` で `Option` の殻を保ったまま中の値に手を入れられます。

```rust
// Rust
# use std::collections::HashMap;
# fn main() {
# let mut scores = HashMap::new();
# scores.insert("blue", 10);
let doubled = scores.get("blue").map(|v| v * 2); // Option<i32>
println!("{doubled:?}"); // Some(20)
# }
```

この `?` は、次の章のエラー処理でも同じ形で出てきます。「無いかもしれない」を扱う `Option` と、「失敗したかもしれない」を扱う `Result` は、Rust では同じ発想で作られた兄弟のような型です。次はその `Result` を見ます。
