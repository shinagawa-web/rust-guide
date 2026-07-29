# ほぼ読めるが、既定が違う

C++ を書いてきたなら、Rust のコードは見た目の大半がすぐ読めます。変数を宣言して、条件で分岐し、ループを回し、関数を呼び、struct にデータをまとめる。C++ と同じ発想で書いて、だいたい意図通りになります。

ただ、いくつか既定が違います。しかもその違いは、たいてい C++ で見落としやすかったところを明示の方向へ振ってあります。このページは、その「ほぼそのまま通じる」部分を対応を確認しながら、既定がずれるところだけを拾います。「C++ のこれは Rust のこれ」と読み替えられれば十分なので、ざっと読み進めてかまいません。同じ感覚では書けないところは、次の章から一つずつ見ます。

## 変数 — 既定が不変で、未初期化が無い

C++ では書き換えられるのが既定でした。Rust は逆で、`let` で宣言した変数は書き換えられないのが既定です。書き換えたいときだけ `mut` を付けます。

```cpp
// C++
auto x = 10;
auto y = 20;
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

型は推論されます。明示するときは変数名のうしろに書きます（`let y: i32 = 20;`）。C++ の `int y = 20;` と比べると、型の位置が変数名のうしろになる点だけ、目が慣れるまでの違和感です。

もう一つの違いは初期化です。C++ では初期化していない変数を読むと未定義動作でした。Rust はそのようなコードをコンパイル時に弾きます。

```cpp
// C++
int x;
std::cout << x; // 未定義動作（コンパイルは通る）
```

```rust
// Rust
fn main() {
    let x: i32;
    println!("{x}"); // コンパイルエラー：x が初期化されていない
}
```

## 型変換 — 暗黙変換が無い

C++ は `static_cast` なしで暗黙に変換できる場面がありました。Rust は型が違えば暗黙には変換しません。変換したいなら `as` を書きます。

```cpp
// C++
long long big = 3'000'000'000;
int n = big; // 暗黙に切り詰め（コンパイラによっては警告）
```

```rust
// Rust
fn main() {
    let big: i64 = 3_000_000_000;
    let n: i32 = big; // コンパイルエラー：i64 を i32 に暗黙には入れられない
}
```

変換するには `as` を書きます。その一行が残るので、切り詰めが起きる変換を目で追えます。

```rust
// Rust
# fn main() {
let big: i64 = 3_000_000_000;
let n = big as i32; // 切り詰めると明示（-1294967296）
# println!("{n}");
# }
```

## 整数のあふれ — 静かに巻き戻らない

C++ では符号付き整数のあふれは未定義動作、符号なしは静かに巻き戻りでした。Rust はデバッグビルドで実行時にパニックして気づかせます。

```cpp
// C++
uint8_t c = 255;
c = c + 1; // 静かに 0 へ巻き戻る
```

```rust
// Rust
fn main() {
    let c: u8 = 255;
    let d = c + 1; // デバッグビルドでは実行時パニック
}
```

巻き戻りをそもそも意図しているなら、`wrapping_add` で明示します。

```rust
// Rust
# fn main() {
let c: u8 = 255;
let d = c.wrapping_add(1); // 巻き戻したいと明示すれば 0
# println!("{d}");
# }
```

## 制御フロー — if / for / match

`if` は C++ とほぼ同じです。違いは、条件を丸括弧で囲まないことと、本体の波括弧を省略できないことです。

```cpp
// C++
if (n > 0) {
    std::cout << "positive\n";
} else {
    std::cout << "zero or negative\n";
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

`for` は範囲やイテレータを回す形が基本です。C++ の `for (int i = 0; i < 5; i++)` のようなカウンタ式はありません。範囲は `0..5` で表します（5 は含みません）。

```cpp
// C++
for (int i = 0; i < 5; i++) {
    std::cout << i << "\n";
}
```

```rust
// Rust
# fn main() {
for i in 0..5 {
    println!("{i}");
}
# }
```

`if` は値を返す式でもあります。C++ の三項演算子 `cond ? 1 : 2` を、`if` そのものでできます。

```cpp
// C++
int n = cond ? 1 : 2;
```

```rust
// Rust
# fn main() {
# let cond = true;
let n = if cond { 1 } else { 2 };
# println!("{n}");
# }
```

C++ の `switch` にあたるのが `match` です。既定が二つ違います。一つはフォールスルーがないこと。`break` を書かなくても次のパターンに流れません。もう一つは網羅性です。取りうる値をすべて扱ったかをコンパイラが確かめます。`_` がそれ以外すべてを受ける腕です。

```cpp
// C++
switch (n) {
    case 1: std::cout << "one"; break;
    case 2: std::cout << "two"; break;
    default: std::cout << "other";
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

## 関数 — fn

C++ の `int add(int a, int b)` のような宣言は、Rust では `fn add(a: i32, b: i32) -> i32` になります。戻り値の型を `->` のうしろに書く点だけが目新しいところです。

一つ違うのが戻り値の返し方です。Rust は関数の最後の式がそのまま戻り値になるので、`return` を省けます。

```cpp
// C++
int add(int a, int b) {
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

ヘッダファイルに分ける必要もありません。定義が一つあれば足り、呼ぶ側より後に定義してもかまいません。

## struct とメソッド — struct と impl

struct の定義は C++ とよく似ています。C++ ではクラスや struct にメソッドを直接書きましたが、Rust はその struct 専用の `impl` ブロックにまとめます。

```cpp
// C++
struct Point {
    int x;
    int y;

    Point add(const Point& q) const {
        return {x + q.x, y + q.y};
    }
};
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

`p.add(&q)` の呼び出し方は同じです。`self` に付いた `&` が所有権と借用の話で、次の章の本題になります。

## 動的配列 — Vec

C++ の `std::vector<int>` にあたるのが `Vec<i32>` です。`push_back` が `push` になる点と、初期値の書き方が変わります。

```cpp
// C++
auto xs = std::vector<int>{1, 2, 3};
xs.push_back(4);
```

```rust
// Rust
# fn main() {
let mut xs = vec![1, 2, 3];
xs.push(4);
println!("{xs:?}"); // [1, 2, 3, 4]
# }
```

`vec![]` はベクタを作るマクロです。Rust では名前の末尾に `!` が付くのがマクロの目印で、コンパイル前にコードを展開する仕組みです。`{xs:?}` の `:?` は、`Vec` のような中身のある値を見やすく出すための指定です。

---

ここまでは、知っている C++ がほぼそのまま使えました。既定がいくつか不変や明示の側へ振ってあるだけで、読み書きの勘はそのまま通じます。次の章からが本題です。C++ と同じ感覚では書けないところ、その土台になる所有権に入ります。
