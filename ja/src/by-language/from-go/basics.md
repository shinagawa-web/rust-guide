# Go とほぼ同じところ

Go を書いてきたなら、Rust のコードは見た目の大半がすぐ読めます。変数を宣言して、条件で分岐し、ループを回し、関数を呼び、構造体にメソッドを生やす。書き方の綴りは違っても、考え方は Go とほとんど変わりません。

このページは、その「ほぼそのまま通じる」部分を、対応関係で一気に確認します。「Go のこれは Rust のこれ」と読み替えられれば十分なので、流し読みでかまいません。同じ感覚では書けないところは、次の章から一つずつ見ます。

## 変数 — let と mut

Go の変数はデフォルトで書き換えられます。Rust は逆で、`let` で束ねた変数はデフォルトで書き換えられません。書き換えたいときだけ `mut` を付けます。

```go
// Go
x := 10
var y = 20
y = 25
```

```rust
// Rust
# fn main() {
let x = 10;
let mut y = 20;
y = 25;
# println!("{x} {y}");
# }
```

型は基本的に推論されます。明示するときは変数のうしろに書きます（`let y: i32 = 20;`）。この「デフォルト不変、変えるなら mut」という既定は、このあとの所有権の話にもつながる Rust の基本姿勢です。

## 制御フロー — if / for / match

`if` と `for` は Go とほぼ同じ感覚で書けます。条件を丸括弧で囲まない点、本体の波括弧を省略できない点も Go と同じです。

```go
// Go
if n > 0 {
    fmt.Println("positive")
} else {
    fmt.Println("zero or negative")
}
```

```rust
// Rust
# fn main() {
# let n = 1;
if n > 0 {
    println!("positive");
} else {
    println!("zero or negative");
}
# }
```

`for` は範囲やイテレータを回す形が基本です。C 風の三項ループはありません。

```go
// Go
for i := 0; i < 5; i++ {
    fmt.Println(i)
}
for i, v := range items {
    fmt.Println(i, v)
}
```

```rust
// Rust
# fn main() {
# let items = ["a", "b", "c"];
for i in 0..5 {
    println!("{i}");
}
for (i, v) in items.iter().enumerate() {
    println!("{i}: {v}");
}
# }
```

`if` は値を返す式です。Go には三項演算子が無いので、いったん変数を宣言してから `if` 文で各分岐に代入しますが、Rust は `if` そのものを代入の右辺に置けます。

```go
// Go
var n int
if cond {
    n = 1
} else {
    n = 2
}
```

```rust
// Rust
# fn main() {
# let cond = true;
let n = if cond { 1 } else { 2 };
# println!("{n}");
# }
```

Go の `switch` にあたるのが `match` です。値ごとに分岐する使い方は Go とよく似ています。Go の `default` にあたるのが `_`（それ以外すべて）です。

```go
// Go
switch n {
case 1:
    fmt.Println("one")
case 2:
    fmt.Println("two")
default:
    fmt.Println("other")
}
```

```rust
// Rust
# fn main() {
# let n = 1;
match n {
    1 => println!("one"),
    2 => println!("two"),
    _ => println!("other"),
}
# }
```

ここでは値で分岐できる程度に覚えておけば十分で、`match` の本領（データを持つ enum の網羅）はあとの章で見ます。

## 関数 — fn

`func` が `fn` になります。戻り値の型は `->` のうしろに書きます。

一つ違うのが戻り値の返し方です。Go は戻り値のある関数では `return` が必須ですが、Rust は関数の最後の式がそのまま戻り値になるので、`return` を省けます。下の `add` は、Go では `return a + b`、Rust では末尾に `;` を付けない式 `a + b` だけで返しています（Rust でも `return a + b;` と明示的に書けます）。

```go
// Go
func add(a, b int) int {
    return a + b
}
```

```rust
// Rust
# fn main() {
#     println!("{}", add(2, 3));
# }
fn add(a: i32, b: i32) -> i32 {
    a + b // 末尾の式が戻り値。return は不要
}
```

## 構造体とメソッド — struct と impl

構造体の定義は Go とよく似ています。違いは、メソッドの置き場所です。Go はレシーバ付きの関数として書きますが、Rust は構造体とは別の `impl` ブロックにまとめます。

```go
// Go
type Point struct {
    X, Y int
}

func (p Point) Add(q Point) Point {
    return Point{p.X + q.X, p.Y + q.Y}
}
```

```rust
// Rust
# fn main() {
#     let p = Point { x: 1, y: 2 };
#     let q = Point { x: 3, y: 4 };
#     let _ = p.add(&q);
# }
struct Point {
    x: i32,
    y: i32,
}

impl Point {
    fn add(&self, q: &Point) -> Point {
        Point { x: self.x + q.x, y: self.y + q.y }
    }
}
```

レシーバは `self` です。Go では値レシーバとポインタレシーバを使い分けましたが、Rust ではその区別が `self`（値ごと受け取る）・`&self`（借りて読む）・`&mut self`（借りて書き換える）の三つになります。この `&` が所有権と借用の話で、次の章の本題です。

## Vec と HashMap

Go のスライスにあたるのが `Vec`、マップにあたるのが `HashMap` です。

```go
// Go
xs := []int{1, 2, 3}
xs = append(xs, 4)

m := map[string]int{"a": 1}
m["b"] = 2
```

```rust
// Rust
# fn main() {
let mut xs = vec![1, 2, 3];
xs.push(4);

use std::collections::HashMap;
let mut m = HashMap::new();
m.insert("a", 1);
m.insert("b", 2);
# println!("{xs:?} {}", m.len());
# }
```

中身を変えるコレクションは `mut` で束ねます。一つ違うのは取り出し方です。Go のマップはキーが無ければゼロ値を返し、`v, ok := m["x"]` で有無を確かめました。Rust の `HashMap` は「無いかもしれない」を `Option` という型で返します。この Option が、Go の nil やカンマ ok の代わりになる仕組みで、これも次の章で見ます。

---

ここまでは、Go の地図がほぼそのまま使えました。次の章からが本題です。Go と同じ感覚では書けないところに入ります。最初は、そのすべての土台になる所有権です。
