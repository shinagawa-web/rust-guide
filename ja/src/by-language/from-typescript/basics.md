# TypeScript とほぼ同じところ

TypeScript を書いてきたなら、Rust のコードは見た目の大半がすぐ読めます。変数を宣言して、条件で分岐し、ループを回し、関数を呼び、型にメソッドを生やす。書き方の綴りは違っても、考え方は TypeScript とほとんど変わりません。型注釈を書く言語だという点も同じで、Rust のコードはむしろ見慣れて見えるはずです。

このページは、その「ほぼそのまま通じる」部分を、対応関係で一気に確認します。「TypeScript のこれは Rust のこれ」と読み替えられれば十分なので、流し読みでかまいません。同じようには書けないところは、次の章から一つずつ見ます。

## 変数 — let と mut

TypeScript では、`const` で宣言した変数はあとから代入できず、`let` で宣言した変数は代入できます。Rust も「書き換えられないのが既定」という点は同じですが、既定側のキーワードが `let` です。書き換えたいときだけ `mut` を付けます。

```ts
// TypeScript
const x = 10;
let y = 20;
y = 25;
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

同じ `let` でも意味が逆になる点に注意してください。TypeScript の `let` は書き換えられる変数ですが、Rust の `let` は書き換えられない変数で、書き換えたいときに `mut` を足します。対応を表にすると、次のようになります。

| したいこと | TypeScript | Rust |
| --- | --- | --- |
| あとから代入できない変数 | `const x = 10` | `let x = 10` |
| あとから代入できる変数 | `let y = 20` | `let mut y = 20` |

Rust にも `const` という言葉は出てきますが、TypeScript の `const` とは別物です。Rust の `const` は、コンパイル時に値が決まっている決め打ちの設定値に名前を付けて、あちこちから使い回すためのものです。`let` が関数の中でしか書けないのに対し、`const` は関数の外に置けて、複数の関数から参照できます。

```rust
// Rust
const MAX_RETRIES: u32 = 3; // 関数の外に置ける。型注釈は必須で、名前は大文字にする

fn main() {
    for _ in 0..MAX_RETRIES {
        // ... 最大 3 回まで試す
    }
}
```

TypeScript でいえば、ファイルの先頭に書いて使い回す `const MAX_RETRIES = 3` がこれにあたります。逆に、関数の中で `const user = getUser()` のように実行して得た値を入れる `const` は、Rust では `let` です。見分け方はこうです。

- コンパイル時に決まっている値（`3`、`1024`、円周率…）に名前を付けて使い回したい → `const`
- 計算結果や実行時に決まる値を入れたい → `let`

型は基本的に推論されます。明示するときは変数のうしろに書きます（`let y: i32 = 20;`）。書く位置は TypeScript の `let y: number = 20;` と同じです。この「既定は書き換え不可、変えるなら mut」という姿勢は、このあとの所有権の話にもつながる Rust の基本です。

## 制御フロー — if / for / match

`if` は TypeScript とほぼ同じ感覚で書けます。違いは、条件を丸括弧で囲まないことと、本体の波括弧を省略できないことです。

```ts
// TypeScript
if (n > 0) {
  console.log("positive");
} else {
  console.log("zero or negative");
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

`for` は範囲やイテレータを回す形が基本です。`for (let i = 0; i < 5; i++)` のような C 風のループはありません。TypeScript の `for...of` にあたるのが、下の `for v in ...` です。

```ts
// TypeScript
for (let i = 0; i < 5; i++) {
  console.log(i);
}
for (const [i, v] of items.entries()) {
  console.log(i, v);
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

TypeScript で分岐して値を選ぶときは、三項演算子 `cond ? 1 : 2` を使うか、いったん `let` で宣言してから各分岐で代入します。Rust では `if` そのものが値を返す式なので、`if` を代入の右辺に直接置けます。

```ts
// TypeScript
const n = cond ? 1 : 2;
```

```rust
// Rust
# fn main() {
# let cond = true;
let n = if cond { 1 } else { 2 };
# println!("{n}");
# }
```

TypeScript の `switch` にあたるのが `match` です。値ごとに分岐する使い方はよく似ています。TypeScript の `default` にあたるのが `_`（それ以外すべて）です。また、`break` を書き忘れて次の case に落ちる心配もありません。

```ts
// TypeScript
switch (n) {
  case 1:
    console.log("one");
    break;
  case 2:
    console.log("two");
    break;
  default:
    console.log("other");
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

`function` が `fn` になります。引数に型を書くのは同じで、戻り値の型は `:` ではなく `->` のうしろに書きます。

一つ違うのが戻り値の返し方です。TypeScript は `return` で返しますが、Rust は関数の最後の式がそのまま戻り値になるので、`return` を省けます。下の `add` は、末尾に `;` を付けない式 `a + b` だけで返しています（Rust でも `return a + b;` と書けます）。

```ts
// TypeScript
function add(a: number, b: number): number {
  return a + b;
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

TypeScript でデータとメソッドをまとめるときは `class` を使うことが多いはずです。Rust では、データを `struct` で定義し、メソッドは別の `impl` ブロックにまとめます。フィールドの宣言とメソッドの実装が分かれている、と考えると読めます。

```ts
// TypeScript
class Point {
  constructor(
    public x: number,
    public y: number,
  ) {}

  add(q: Point): Point {
    return new Point(this.x + q.x, this.y + q.y);
  }
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

TypeScript の `this` にあたるのが `self` です。ただし Rust では受け取り方を三つに書き分けます。`self`（値ごと受け取る）・`&self`（借りて読む）・`&mut self`（借りて書き換える）です。この `&` が所有権と借用の話で、次の章の本題です。

## Vec と HashMap

TypeScript の配列にあたるのが `Vec`、`Map` にあたるのが `HashMap` です。

```ts
// TypeScript
const xs = [1, 2, 3];
xs.push(4);
console.log(xs); // [ 1, 2, 3, 4 ]

const m = new Map<string, number>();
m.set("a", 1);
m.set("b", 2);
console.log(m.get("a")); // 1
```

```rust
// Rust
# fn main() {
let mut xs = vec![1, 2, 3];
xs.push(4);
println!("{xs:?}"); // [1, 2, 3, 4]

use std::collections::HashMap;
let mut m = HashMap::new();
m.insert("a", 1);
m.insert("b", 2);
println!("{:?}", m.get("a")); // Some(1)
# }
```

出力の `{xs:?}` に付いた `:?` は、`Vec` や `HashMap` のような中身のある値を、そのまま見やすく出すための指定です。`{xs}` だけだと `Vec` は表示できず、`{xs:?}` とすると `[1, 2, 3, 4]` のように出せます。

ここで一つ引っかかるのが `mut` です。TypeScript では `const xs = [1, 2, 3]` としても `xs.push(4)` は通ります。`const` は変数の代入し直しを止めるだけで、中身の書き換えは止めないからです。Rust の `let` は中身の書き換えも止めるので、`push` するには `let mut` で束ねる必要があります。

もう一つ違うのが取り出し方です。TypeScript の `Map` はキーが無ければ `undefined` を返し、`map.get("x")` の結果は `number | undefined` になりました。Rust の `HashMap` は「無いかもしれない」を `Option` という型で返します。この `Option` が、TypeScript の `undefined` の代わりになる仕組みで、これも次の章のあとで見ます。

---

ここまでは、知っている TypeScript がほぼそのまま使えました。次の章からが本題です。TypeScript と同じようには書けないところに入ります。最初は、そのすべての土台になる所有権です。
