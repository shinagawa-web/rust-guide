# ジェネリクス

中身の型が違うだけで処理はまったく同じ、というとき、型そのものをパラメータにして、一つの処理を使い回します。これがジェネリクスです。処理を型で使い回す書き方から始めて、「その型ができること」を要求するトレイト境界、そして自分の型をジェネリックにする書き方まで見ていきます。

## 同じ処理を型ごとに書く

リストの中から一番大きい要素を返す関数です。まずは整数で書きます。

```rust
fn largest_i32(list: &[i32]) -> &i32 {
    let mut largest = &list[0];
    for item in list {
        if item > largest {
            largest = item;
        }
    }
    largest
}

fn main() {
    let numbers = vec![34, 50, 25, 100, 65];
    println!("{}", largest_i32(&numbers)); // 100
}
```

同じことを小数でもやりたくなります。中身のロジックは一字一句同じなのに、型が `i32` から `f64` に変わるだけで、もう一つ関数を書くことになります。

```rust
fn largest_f64(list: &[f64]) -> &f64 {
    let mut largest = &list[0];
    for item in list {
        if item > largest {
            largest = item;
        }
    }
    largest
}

fn main() {
    let numbers = vec![1.5, 3.2, 0.8];
    println!("{}", largest_f64(&numbers)); // 3.2
}
```

見比べても、違うのは型だけです。処理が同じなら、一つで済ませたい。

## 型をパラメータにする

そこで、型の位置に具体的な型を書く代わりに、`T` という仮の名前を置きます。これがジェネリクスです。

```rust
fn largest<T>(list: &[T]) -> &T {
    let mut largest = &list[0];
    for item in list {
        if item > largest {
            largest = item;
        }
    }
    largest
}
```

`largest<T>` の `<T>` は、「これから出てくる `T` は、呼び出すときに決まる型の名前です」という宣言です。`i32` のリストを渡せば `T` は `i32`、`f64` のリストを渡せば `f64` になります。型を一つ、パラメータにしたわけです。

ところが、これはまだコンパイルできません。

```text
error[E0369]: binary operation `>` cannot be applied to type `&T`
```

`>` で比べられません、というエラーです。`T` は「どんな型でも」なので、大小を比べられない型も含みます。コンパイラは、`T` が比べられる型だと確かめられない以上、`>` を書かせてくれません。

## その型ができることを要求する

必要なのは、`T` に「大小を比べられる型に限る」と条件を付けることです。この「大小を比べられる」は、標準ライブラリの `PartialOrd` というトレイトが表しています。`T` のうしろに `: PartialOrd` と書いて要求します。

```rust
fn largest<T: PartialOrd>(list: &[T]) -> &T {
    let mut largest = &list[0];
    for item in list {
        if item > largest {
            largest = item;
        }
    }
    largest
}

fn main() {
    println!("{}", largest(&vec![34, 50, 25, 100, 65])); // 100
    println!("{}", largest(&vec![1.5, 3.2, 0.8]));       // 3.2
    println!("{}", largest(&vec!['y', 'm', 'a', 'q']));  // y
}
```

`<T: PartialOrd>` は、「`T` は `PartialOrd` を持つ型に限る」という意味です。これで `largest` の中では、`T` がどんな型であっても `>` で比べられると保証されます。整数・小数・文字はどれも `PartialOrd` を持つので、そのまま渡せます。関数はこれ一つ。呼ぶときに型が決まります。

この `: PartialOrd` を、トレイト境界と呼びます。

## 自分の型をジェネリックにする

ジェネリクスは関数だけのものではありません。自分で定義する型にも、型パラメータを持たせられます。二つの値をまとめて持つ struct を考えます。

```rust
struct Pair<T> {
    first: T,
    second: T,
}

impl<T> Pair<T> {
    fn first(&self) -> &T {
        &self.first
    }
}

fn main() {
    let numbers = Pair { first: 1, second: 2 };
    println!("{}", numbers.first()); // 1

    let words = Pair { first: "はい", second: "いいえ" };
    println!("{}", words.first());   // はい
}
```

`struct Pair<T>` は、「中に持つ値の型 `T` は、作るときに決める」という宣言です。整数を入れれば `Pair<i32>`、文字列を入れれば `Pair<&str>` になり、同じ `Pair` を型を変えて使い回せます。`impl<T> Pair<T>` の最初の `<T>` は、この実装ブロックでも `T` を型の名前として使う、という宣言です。

## 複数のトレイト境界・複数の型

トレイト境界は一つとは限りません。一番大きい要素を返しつつ、その値を表示したいなら、「比べられる」ことに加えて「表示できる」ことも要求します。表示できることは `Display` というトレイトが表します。トレイト境界は `+` でつなげて並べます。

```rust
use std::fmt::Display;

fn announce_largest<T: PartialOrd + Display>(list: &[T]) -> &T {
    let mut largest = &list[0];
    for item in list {
        if item > largest {
            largest = item;
        }
    }
    println!("一番大きいのは {largest}");
    largest
}

fn main() {
    announce_largest(&vec![34, 50, 25, 100, 65]);
    // → 一番大きいのは 100
}
```

トレイト境界が増えてくると、`<T: PartialOrd + Display>` が長くなって関数の見た目を圧迫します。そういうときは `where` に書き出せます。意味は変わりません。

```rust
use std::fmt::Display;

fn announce_largest<T>(list: &[T]) -> &T
where
    T: PartialOrd + Display,
{
    let mut largest = &list[0];
    for item in list {
        if item > largest {
            largest = item;
        }
    }
    println!("一番大きいのは {largest}");
    largest
}

fn main() {
    announce_largest(&vec!['y', 'm', 'a', 'q']);
    // → 一番大きいのは y
}
```

型パラメータは一つとは限りません。二つの値の型を別々にしたければ、`<T, U>` のように書きます。

```rust
struct Pair<T, U> {
    first: T,
    second: U,
}

fn main() {
    let p = Pair { first: 1, second: "one" };
    println!("{} {}", p.first, p.second); // 1 one
}
```

`first` は整数、`second` は文字列、というように、それぞれ別の型を後から決められます。

## まとめ

- ジェネリクスは、中身の型が違うだけで同じ処理を、型パラメータ `<T>` にして一つで書く仕組み。`Vec<T>` の `<T>` もこれ。
- そのままの `T` は「どんな型でも」なので、中で `>` すらできない。`<T: PartialOrd>` のように「その型ができること」を要求して初めて、中で使える。これがトレイト境界。
- 型は自分の `struct` にも持たせられる。トレイト境界は `+` で重ね、多くなれば `where` に切り出す。型パラメータは `<T, U>` と複数持てる。

次は「関数そのものを値として渡す」書き方を見ます。[クロージャ](closures.md) です。
