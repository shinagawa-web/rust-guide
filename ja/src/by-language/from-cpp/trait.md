# トレイト

## 純粋仮想関数と trait

C++ で「複数の型に共通の振る舞いを持たせる」には、純粋仮想関数を含む基底クラスを定義して、それを継承させます。

```cpp
// C++
#include <cmath>
#include <iostream>

struct Shape {
    virtual double area() const = 0;
    virtual ~Shape() = default;  // ポインタ経由で delete するために必要
};

struct Circle : Shape {
    double radius;
    Circle(double r) : radius(r) {}
    double area() const override { return M_PI * radius * radius; }
};

struct Rect : Shape {
    double w, h;
    Rect(double w, double h) : w(w), h(h) {}
    double area() const override { return w * h; }
};

int main() {
    Circle c(1.0);
    Rect r(3.0, 4.0);
    std::cout << c.area() << "\n"; // 3.14159...
    std::cout << r.area() << "\n"; // 12
}
```

`virtual ~Shape() = default;` は、`Shape*` 経由で `delete` するときに派生クラスのデストラクタが呼ばれるために必要です。書き忘れると、ポインタ経由で解放したときに派生クラスのリソースがリークします。

`area()` の実装を書き忘れた場合、クラスが抽象クラスのままになりインスタンス化できないのでコンパイルエラーになります。ただしエラーは「抽象クラスはインスタンス化できない」という形で出るため、何を実装すべきかはメッセージから直接は読み取れません。

```cpp
// C++（コンパイルエラー）
struct Circle : Shape {
    double radius;
    Circle(double r) : radius(r) {}
    // area() の実装を忘れた
};

int main() {
    Circle c(1.0); // error: cannot declare variable 'c' to be of abstract type 'Circle'
}
```

Rust では同じ目的に `trait` を使います。`trait` で振る舞いを定義し、`impl TraitName for Type` の形で型ごとに実装します。

```rust
// Rust
trait Shape {
    fn area(&self) -> f64;
}

struct Circle {
    radius: f64,
}

struct Rect {
    w: f64,
    h: f64,
}

impl Shape for Circle {
    fn area(&self) -> f64 {
        std::f64::consts::PI * self.radius * self.radius
    }
}

impl Shape for Rect {
    fn area(&self) -> f64 {
        self.w * self.h
    }
}

fn main() {
    let c = Circle { radius: 1.0 };
    let r = Rect { w: 3.0, h: 4.0 };
    println!("{}", c.area()); // 3.141592653589793
    println!("{}", r.area()); // 12
}
```

継承はありません。`impl Shape for Circle` と書くことで `Circle` に `Shape` の振る舞いを追加します。

`virtual ~Shape() = default;` のようなデストラクタも不要です。各型のクリーンアップはスコープを抜けたタイミングで自動的に動くので、`trait` 側に書くものはありません。

実装漏れのエラーメッセージは、何が足りないかを名指しします。

```rust
// Rust（コンパイルエラー）
trait Shape {
    fn area(&self) -> f64;
}

struct Circle {
    radius: f64,
}

impl Shape for Circle {
    // area を書き忘れた
}

fn main() {
    let c = Circle { radius: 1.0 };
    println!("{}", c.area());
}
```

```
error[E0046]: not all trait items implemented, missing: `area`
```
