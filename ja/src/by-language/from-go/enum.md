# データを持つ enum と match

「値がいくつかの種類のどれか一つで、しかも種類ごとに持つデータが違う」。これを一つの型で表す道具が、Go にはありません。近いのは、種類を表すフィールドを持たせた struct か、interface と型スイッチです。どちらで書いても、「全部の種類を漏れなく扱ったか」を型では確かめられません。ここでは前者の struct で、そのすき間を具体的に見ます。

Rust の enum は、種類そのものを型にします。種類ごとに別々のデータを持たせられ、`match` で全部の種類を扱ったかどうかをコンパイラが確かめます。すでに使った `Option` の `Some` / `None` や `Result` の `Ok` / `Err` も、この enum です。ここでは自分の enum を作ります。

題材は図形です。円は半径、長方形は幅と高さ。種類によって必要な数値が違います。そこから面積を出します。

## Go では、種類フラグと場合分けで表す

種類を表す `Kind` と、種類ごとに使う数値を、一つの struct にまとめます。

```go
// Go
type Shape struct {
    Kind   string  // "circle" か "rectangle"
    Radius float64 // circle のときだけ使う
    Width  float64 // rectangle のときだけ使う
    Height float64
}

func Area(s Shape) float64 {
    switch s.Kind {
    case "circle":
        return math.Pi * s.Radius * s.Radius
    case "rectangle":
        return s.Width * s.Height
    }
    return 0
}
```

この形は動きますが、いくつかのすき間があります。

一つ目。`Kind` と、その種類に必要なデータが、型で結びついていません。だから `circle` なのに `Radius` を入れ忘れても、コンパイルは通ります。`Radius` はゼロ値の `0` になり、`Area` は半径0の円として黙って `0` を返します。

```go
// Go
c := Shape{Kind: "circle"} // Radius を入れ忘れ
fmt.Println(Area(c))       // 0。半径の無い円が、そのまま通る
```

二つ目。`Kind` はただの文字列なので、`"circle"` を打ち間違えても、コンパイラは何も言いません。どの `case` にも合わず、`Area` は黙って `0` を返します。

```go
// Go
c := Shape{Kind: "cicle", Radius: 2} // "circle" の打ち間違い
fmt.Println(Area(c))                 // 0。間違いに気づけない
```

三つ目。新しい種類、たとえば三角形を足したとします。`Area` の `switch` に `case "triangle"` を書き足し忘れても、コンパイルは通ります。三角形の面積は、黙って `0` になります。

```go
// Go
t := Shape{Kind: "triangle", Width: 3, Height: 4}
fmt.Println(Area(t)) // 0。case を足し忘れても、誰も教えてくれない
```

このうち二つ目は、種類を文字列で持つ、この手ゆえの穴です。Go でも interface と型スイッチにすれば、`Kind` の文字列が消えて、打ち間違いの穴も消えます。

一つ目と三つ目は、手を変えても残ります。Go は、その種類に必要なデータが揃っているかも、全部の種類を扱ったかも、型では強制しないからです。種類とそのデータを型で結び、扱い漏れも防ぐ。これを一つの型でまとめて引き受けるのが、Rust の enum です。次から見ます。

## Rust では、種類そのものを enum にする

種類を `enum` の並びにし、それぞれに必要なデータだけを持たせます。

```rust
// Rust
enum Shape {
    Circle { radius: f64 },
    Rectangle { width: f64, height: f64 },
}
```

`Circle` は `radius` だけ、`Rectangle` は `width` と `height` だけを持ちます。どの種類が何を持つかが型に書かれていて、`Shape::Circle` を作るには `radius` を必ず書かねばならず、`Shape::Circle {}` はコンパイルエラーです。一つ目のすき間、必要なデータを入れ忘れた円が黙って通ることが、はじめから起きません。

種類は `Shape::Circle` のような名前で表します。ただの文字列ではないので、打ち間違えればコンパイルエラーです。二つ目のすき間、`Kind` の打ち間違いに気づけないことも、これで塞がります。

## match で全部の種類を扱う

面積を出す関数を `match` で書きます。

```rust
// Rust
use std::f64::consts::PI;

# enum Shape {
#     Circle { radius: f64 },
#     Rectangle { width: f64, height: f64 },
# }
fn area(shape: &Shape) -> f64 {
    match shape {
        Shape::Circle { radius } => PI * radius * radius,
        Shape::Rectangle { width, height } => width * height,
    }
}
```

それぞれの分岐では、その種類が持つデータだけを取り出せます。`Circle` の分岐で `radius`、`Rectangle` の分岐で `width` と `height`、という具合です。

そして `match` は、enum の全部の種類を扱わないとコンパイルが通りません。一つでも扱い漏れがあれば、そこで止まります。

三つ目のすき間で見た三角形の追加を、Rust でやってみます。`enum` に `Triangle` を足したのに、`area` の `match` を直し忘れたとします。

```rust
// Rust
enum Shape {
    Circle { radius: f64 },
    Rectangle { width: f64, height: f64 },
    Triangle { base: f64, height: f64 }, // 新しく足した
}

fn area(shape: &Shape) -> f64 {
    match shape {
        Shape::Circle { radius } => std::f64::consts::PI * radius * radius,
        Shape::Rectangle { width, height } => width * height,
        // Triangle の分岐を書き忘れている
    }
}
// コンパイルエラー: non-exhaustive patterns: `&Shape::Triangle { .. }` not covered
```

Go では `case` の書き足し忘れに気づけず `0` になりましたが、Rust は足し忘れを、どの種類が漏れているかまで、その場で教えてくれます。三つ目のすき間も、これで塞がります。

呼び出し側も見ておきます。種類は違っても、どちらも `Shape` という一つの型なので、そのまま一つの `Vec` に並べられます。

```rust
// Rust
# use std::f64::consts::PI;
# enum Shape {
#     Circle { radius: f64 },
#     Rectangle { width: f64, height: f64 },
# }
# fn area(shape: &Shape) -> f64 {
#     match shape {
#         Shape::Circle { radius } => PI * radius * radius,
#         Shape::Rectangle { width, height } => width * height,
#     }
# }
fn main() {
    let shapes = vec![
        Shape::Circle { radius: 2.0 },
        Shape::Rectangle { width: 3.0, height: 4.0 },
    ];
    for s in &shapes {
        println!("{:.2}", area(s)); // 12.57 / 12.00
    }
}
```

`Option` や `Result` を `match` で場合分けしていたのと、仕組みは同じです。あのときは標準ライブラリが用意した enum を、ここでは自分で作った enum を、同じ `match` で種類ごとに分けているだけです。「種類が有限で、種類ごとにデータが違い、全部を漏れなく扱いたい」場面が、Rust では enum と `match` の担当になります。

ここまでで、Go に無い「データを持つ enum」と、それを漏れなく場合分けする `match` を見ました。次は、Go の goroutine や channel と似て非なる、Rust の並行性を見ます。
