# クロージャ

リストを変換する、条件でフィルタする。そのたびに関数を定義して名前をつけていると、本筋と無関係なコードが増えていきます。Rust にはその場で処理を書いて渡せるクロージャという仕組みがあります。名前付き関数を値として渡す書き方から始めて、クロージャの構文、外側の変数を取り込むキャプチャ、引数としての受け取り方まで見ていきます。

## 関数を値として渡す

Rust では関数は値として扱えます。次の `apply` は、スライスと「`i32` を受け取って `i32` を返す関数」を引数に取ります。

```rust
fn double(x: i32) -> i32 {
    x * 2
}

fn apply(nums: &[i32], f: fn(i32) -> i32) -> Vec<i32> {
    let mut result = Vec::new();
    for &n in nums {
        result.push(f(n));
    }
    result
}

fn main() {
    let nums = vec![1, 2, 3, 4, 5];
    let result = apply(&nums, double);
    println!("{:?}", result); // [2, 4, 6, 8, 10]
}
```

`f: fn(i32) -> i32` が関数を受け取る引数です。`double` は `()` を付けずに名前だけ書くと、値として渡せます。

別の変換も使いたいときは、その分だけ関数を定義することになります。

```rust
fn double(x: i32) -> i32 { x * 2 }
fn square(x: i32) -> i32 { x * x }
fn add_three(x: i32) -> i32 { x + 3 }

fn apply(nums: &[i32], f: fn(i32) -> i32) -> Vec<i32> {
    let mut result = Vec::new();
    for &n in nums {
        result.push(f(n));
    }
    result
}

fn main() {
    let nums = vec![1, 2, 3, 4, 5];
    println!("{:?}", apply(&nums, double));     // [2, 4, 6, 8, 10]
    println!("{:?}", apply(&nums, square));     // [1, 4, 9, 16, 25]
    println!("{:?}", apply(&nums, add_three));  // [4, 5, 6, 7, 8]
}
```

変換が1つ増えるたびに、定義が1行増えます。`apply` に1回渡すだけの処理のために名前をつけ続けるのは冗長です。

## クロージャの書き方

`|x| x * x` のように、`|` で囲んだ引数リストと処理を並べると、処理を名前なしで `apply` に渡せます。

```rust
fn apply(nums: &[i32], f: fn(i32) -> i32) -> Vec<i32> {
    let mut result = Vec::new();
    for &n in nums {
        result.push(f(n));
    }
    result
}

fn main() {
    let nums = vec![1, 2, 3, 4, 5];
    println!("{:?}", apply(&nums, |x| x * 2));  // [2, 4, 6, 8, 10]
    println!("{:?}", apply(&nums, |x| x * x));  // [1, 4, 9, 16, 25]
    println!("{:?}", apply(&nums, |x| x + 3));  // [4, 5, 6, 7, 8]
}
```

`|引数| 処理` が基本の形です。引数と返り値の型は、使われ方から推論されるため省略できます。

引数が複数あるときは `,` で区切ります。

```rust
fn main() {
    let add = |x, y| x + y;
    println!("{}", add(3, 4)); // 7
}
```

処理が複数行になるときは `{}` で囲みます。最後の式が返り値です。

```rust
fn main() {
    let add_and_double = |x, y| {
        let sum = x + y;
        sum * 2
    };
    println!("{}", add_and_double(3, 4)); // 14
}
```

## 環境をキャプチャする

クロージャは、定義されたスコープの変数を参照できます。

```rust
fn main() {
    let threshold = 10;
    let is_big = |x| x > threshold;
    println!("{}", is_big(5));  // false
    println!("{}", is_big(15)); // true
}
```

`threshold` はクロージャの引数ではなく、外側のスコープから取り込んでいます。通常の関数にはこれができません。

```rust
fn is_big(x: i32) -> bool {
    x > threshold // error: cannot find value `threshold` in this scope
}
```

関数は呼び出し元のスコープを参照できないため、`threshold` は引数として受け取るしかありません。

```rust
fn is_big(x: i32, threshold: i32) -> bool {
    x > threshold
}

fn main() {
    let threshold = 10;
    println!("{}", is_big(5, threshold));  // false
    println!("{}", is_big(15, threshold)); // true
}
```

クロージャは定義された時点のスコープを持ち込めます。これをキャプチャと言います。

## 引数として受け取る

前のセクションの `apply` は `fn(i32) -> i32` を引数に取っていました。この型はキャプチャを持つクロージャを渡せません。

```rust
fn main() {
    let factor = 3;
    let nums = vec![1, 2, 3, 4, 5];
    apply(&nums, |x| x * factor); // error: expected fn pointer, found closure
}
```

キャプチャを持つクロージャを受け取るには `impl Fn(...)` を使います。

```rust
fn apply(nums: &[i32], f: impl Fn(i32) -> i32) -> Vec<i32> {
    let mut result = Vec::new();
    for &n in nums {
        result.push(f(n));
    }
    result
}

fn main() {
    let factor = 3;
    let nums = vec![1, 2, 3, 4, 5];
    println!("{:?}", apply(&nums, |x| x * factor)); // [3, 6, 9, 12, 15]
}
```

## まとめ

- クロージャは `|引数| 処理` で書く名前のない関数。引数と返り値の型は使われ方から推論される。
- 外側のスコープの変数を参照できる（キャプチャ）。通常の関数にはこれができない。
- クロージャを引数として受け取るには `impl Fn` を使う。`fn` 型ではキャプチャを持つクロージャを渡せない。
