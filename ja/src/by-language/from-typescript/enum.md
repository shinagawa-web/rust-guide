# union 型の代わりに enum と match

TypeScript では、種類の違う値を union 型で一つにまとめられます。`A | B | C` と `|` で並べ、`kind` のような判別フィールドを見て場合分けする書き方です。種類ごとに持つデータが違っても、一つの型として扱えます。

Rust で同じことをするのが enum です。TypeScript の union が型を `|` でつなぐのに対し、Rust の enum は種類そのものを定義に並べ、種類ごとに違うデータを持たせられます。enum を扱うときは match で場合分けします。この match には、全部の種類を扱ったかをコンパイルが確かめてくれる、という TypeScript の switch には無い性質があります。

この章は、図形の面積を求める、という場面で進めます。図形には円と長方形があり、それぞれ持つ値が違います（円は半径、長方形は幅と高さ）。種類によって持つデータが違うものを一つの型にまとめ、種類ごとに計算を分ける、という enum の典型がここに出てきます。

## TypeScript では、判別フィールドで場合分けする

円と長方形をそれぞれ型にして、union でつなぎます。`kind` を見れば、今どちらなのかが分かります。

```ts
// TypeScript
type Circle = { kind: "circle"; r: number };
type Rect = { kind: "rect"; w: number; h: number };
type Shape = Circle | Rect;

function area(shape: Shape): number {
  switch (shape.kind) {
    case "circle":
      return Math.PI * shape.r ** 2;
    case "rect":
      return shape.w * shape.h;
  }
}
```

`Shape` は「円か長方形のどちらか」です。円のときは `r` を、長方形のときは `w` と `h` を持ちます。`area` は `shape.kind` で場合分けし、その `case` の中では、その種類が持つ値だけを使えます。`case "circle"` の中で `shape.r` を読めるのは、そこに来た時点で円だと分かっているからです。

TypeScript のこの書き心地は、Rust の enum とよく似ています。違いは、種類とデータのまとめ方と、扱い漏れの防ぎ方にあります。

## Rust では、種類とデータを enum にまとめる

同じ図形を Rust の enum で書きます。種類を一つずつ並べ、それぞれに、その種類が持つデータを書きます。

```rust
// Rust
enum Shape {
    Circle { r: f64 },
    Rect { w: f64, h: f64 },
}
```

`Shape` は円か長方形のどちらかで、`Circle` は `r` を、`Rect` は `w` と `h` を持ちます。TypeScript では `kind: "circle"` という判別フィールドを自分で足しましたが、Rust では種類の名前（`Circle` / `Rect`）がそのまま判別に使われるので、判別用のフィールドは要りません。持つデータの形が種類ごとに違ってよいのも、TypeScript の union と同じです。

これを使う `area` を書きます。場合分けは switch ではなく match です。

```rust
// Rust
# enum Shape {
#     Circle { r: f64 },
#     Rect { w: f64, h: f64 },
# }
fn area(shape: &Shape) -> f64 {
    match shape {
        Shape::Circle { r } => std::f64::consts::PI * r * r,
        Shape::Rect { w, h } => w * h,
    }
}
```

`match shape` は `shape` の種類ごとに分岐を並べます。`Shape::Circle { r }` は「もし円なら、その `r` を取り出して」という意味で、`=>` の右にその場合の計算を書きます。ここで取り出した `r` は、その分岐の中だけで使えます。TypeScript の `case "circle"` の中でだけ `shape.r` を読めたのと、同じ感覚です。`Rect` の側も同じで、`w` と `h` を取り出して掛けます。

種類の判別と、その種類が持つ値の取り出しが、`Shape::Circle { r }` の一行で同時に済みます。TypeScript では「`kind` を見て場合分けし、その中でフィールドを読む」の二段でしたが、Rust の match は分岐と取り出しを一度に書きます。

## match で、扱い漏れをコンパイルが止める

enum と match の組み合わせがいちばん効くのは、種類が増えたときです。図形に三角形を足してみます。

```rust
// Rust
enum Shape {
    Circle { r: f64 },
    Rect { w: f64, h: f64 },
    Triangle { base: f64, height: f64 },
}
```

`Shape` に `Triangle` を足しただけで、さきほどの `area` はコンパイルが通らなくなります。match が `Circle` と `Rect` しか扱っておらず、`Triangle` が抜けているからです。

```
error[E0004]: non-exhaustive patterns: `&Shape::Triangle { .. }` not covered
```

match は、その enum の全部の種類を扱うことを求めます。一つでも抜けていれば、実行する前にコンパイルが止めて、どの種類が抜けているかまで教えてくれます。三角形の面積を足し忘れたまま動いてしまう、ということが起きません。

```rust
// Rust
# enum Shape {
#     Circle { r: f64 },
#     Rect { w: f64, h: f64 },
#     Triangle { base: f64, height: f64 },
# }
fn area(shape: &Shape) -> f64 {
    match shape {
        Shape::Circle { r } => std::f64::consts::PI * r * r,
        Shape::Rect { w, h } => w * h,
        Shape::Triangle { base, height } => base * height / 2.0,
    }
}
```

`Triangle` の分岐を足せば、また通ります。種類が増えるたびに、match が「まだ扱っていないものがある」と指してくれるので、対応すべき箇所を探し回らずに済みます。

TypeScript の switch も、書き方しだいでは近いことをしてくれます。さきほどと同じように三角形を足し、`switch` には `case` を書き足さないでみます。

```ts
// TypeScript
type Triangle = { kind: "triangle"; base: number; height: number };
type Shape = Circle | Rect | Triangle; // Triangle を足した

function area(shape: Shape): number {   // ← ここでコンパイルエラー
  switch (shape.kind) {
    case "circle":
      return Math.PI * shape.r ** 2;
    case "rect":
      return shape.w * shape.h;
    // triangle の case を書き忘れている
  }
}
// error TS2366: Function lacks ending return statement
//               and return type does not include 'undefined'.
```

ただし、止め方が Rust とは違います。エラーは「switch に triangle が抜けている」ではなく、「戻り値が `number` なのに、値を返さない経路がある」という言い方です。switch が case 漏れそのものを見張っているのではなく、戻り値の型 `: number` を書いているおかげで間接的にかかる網だからです。だから、どの種類が抜けているかまでは指してくれませんし、戻り値の型注釈を外すと `number | undefined` と推論されて、その場では通ってしまいます。Rust の match は、そうした前提なしに止め、さきほどの `&Shape::Triangle { .. } not covered` のように、抜けている種類まで名指しします。

種類の違う値をまとめる union 型は、Rust では enum になります。判別フィールドを自分で足す代わりに種類の名前がそのまま判別を兼ね、扱い漏れは、switch では戻り値の型に頼った間接的なチェックなのに対し、match が種類まで名指しして止めてくれる。ここまでが、TypeScript と同じようには書けないところでした。次は、TypeScript のシングルスレッドな非同期とは事情の違う、Rust の並行性を見ます。
