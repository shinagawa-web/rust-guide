# クロージャ

## 関数を値として渡す

数値のリストに「ある変換」を適用して新しいリストを返す処理を書くとします。変換の内容が変わるたびに関数を書き直すのは手間がかかります。変換の「中身」だけを呼び出し側から渡せるようにすれば、同じ仕組みをそのまま使い回せます。

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

ただし、変換を変えるたびに関数に名前をつけて定義するのは面倒です。「2乗する」「3を足す」など、その場限りの変換まで全部名前をつけていたらコードが増えてしまいます。

Rust にはその場で処理を書ける書き方が用意されています。`|x| x * x` のように、`|` で囲んだ引数リストと処理を並べると、名前なしで渡せます。

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
    let result = apply(&nums, |x| x * x);
    println!("{:?}", result); // [1, 4, 9, 16, 25]
}
```

`|x| x * x` がクロージャです。次のセクションではこの書き方を詳しく見ていきます。
