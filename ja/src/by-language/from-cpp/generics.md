# テンプレートとジェネリクス

C++ では `template<typename T>` を使うと、型に依存しない関数やクラスを書けます。Rust でも同じことができ、`fn foo<T>` の形で型をパラメータとして受け取ります。

任意の型の値を表示する関数を両言語で書くと、次のようになります。

```cpp
// C++
#include <iostream>

template <typename T>
void show(T value) {
    std::cout << value << "\n";
}

int main() {
    show(42);
    show("hello");
    show(3.14);
}
```

```rust
// Rust
fn show<T: std::fmt::Display>(value: T) {
    println!("{value}");
}

fn main() {
    show(42);
    show("hello");
    show(3.14);
}
```

Rust 側に `T: std::fmt::Display` という記述があります。`Display` とは「テキストとして表示できる」という振る舞いを表すトレイトです。`println!` でそのまま出力するには、`T` がこの振る舞いを持つと宣言しておく必要があります。この記述のことをトレイト境界といいます。

なぜ C++ 側には制約の記述がないのに、Rust 側にはあるのかは、次のセクションで見ます。

## テンプレートはインスタンス化までエラーが出ない

C++ のテンプレートは、型に制約をつけなくても書けます。使えない操作が含まれていても、テンプレートを定義した時点ではエラーになりません。エラーになるのは、その型で実際に呼び出したときです。

次の例は、2つの値を足すテンプレート関数です。`operator+` を持たない型を渡すとどうなるか見てみます。

```cpp
// C++（コンパイルエラー）
struct Point {
    int x, y;
};

template <typename T>
T add(T a, T b) {
    return a + b;
}

int main() {
    Point p{1, 2};
    Point q{3, 4};
    auto r = add(p, q);
}
```

```text
error: invalid operands to binary expression ('Point' and 'Point')
    return a + b;
           ~ ^ ~
note: in instantiation of function template specialization 'add<Point>' requested here
    auto r = add(p, q);
             ^
```

エラーは `return a + b;` を指しています。`add(p, q)` を呼び出した行は note として付くだけです。エラーが自分で書いていないテンプレートの内側を指すため、「自分の `Point` に `operator+` がない」という原因を自分でたどる必要があります。

## トレイト境界で制約をつける

Rust のジェネリクスは、最初からトレイト境界で制約を書く設計になっています。`T: std::ops::Add<Output = T>` と書くと、「`T` は加算ができて、結果も `T` になる」と宣言したことになります。

これはドキュメントとしても機能します。関数のシグネチャを見るだけで、`T` に何が要求されるかわかります。

```rust
// Rust
fn add<T: std::ops::Add<Output = T>>(a: T, b: T) -> T {
    a + b
}

fn main() {
    println!("{}", add(1, 2));       // 3
    println!("{}", add(1.5, 2.5));   // 4
}
```

先ほどと同じ `Point` を渡すとどうなるか見てみます。

```rust
// Rust（コンパイルエラー）
struct Point {
    x: i32,
    y: i32,
}

fn add<T: std::ops::Add<Output = T>>(a: T, b: T) -> T {
    a + b
}

fn main() {
    let p = Point { x: 1, y: 2 };
    let q = Point { x: 3, y: 4 };
    let _ = add(p, q);
}
```

```text
error[E0277]: cannot add `Point` to `Point`
    let _ = add(p, q);
            ^^^ no implementation for `Point + Point`

help: the trait `Add` is not implemented for `Point`

note: required by a bound in `add`
    fn add<T: std::ops::Add<Output = T>>(a: T, b: T) -> T {
              ^^^^^^^^^^^^^^^^^^^^^^^^^ required by this bound in `add`
```

エラーは `add(p, q)` を呼び出した行を指しています。`Point` に `Add` が実装されていないと明示されるので、`impl std::ops::Add for Point` を書けばよいとわかります。「どのトレイト境界が要求しているか」も note として出るため、原因まで一本で読めます。

```rust
// Rust
use std::ops::Add;

#[derive(Debug)]
struct Point {
    x: i32,
    y: i32,
}

impl Add for Point {
    type Output = Point;
    fn add(self, other: Point) -> Point {
        Point { x: self.x + other.x, y: self.y + other.y }
    }
}

fn add<T: std::ops::Add<Output = T>>(a: T, b: T) -> T {
    a + b
}

fn main() {
    let p = Point { x: 1, y: 2 };
    let q = Point { x: 3, y: 4 };
    println!("{:?}", add(p, q)); // Point { x: 4, y: 6 }
}
```

C++ のテンプレートはインスタンス化するまで型のチェックを後回しにします。Rust のジェネリクスはトレイト境界で条件を定義時に宣言しておき、呼び出した側でその過不足を確認します。
