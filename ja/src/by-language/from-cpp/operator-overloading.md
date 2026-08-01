# 演算子オーバーロード

## operator と trait の対応

C++ では `operator` キーワードで演算子を定義します。`Point` に `+` を定義する例です。

```cpp
// C++
struct Point {
    int x, y;
    Point operator+(const Point& other) const {
        return {x + other.x, y + other.y};
    }
};

int main() {
    Point p{1, 2}, q{3, 4};
    Point r = p + q;
}
```

Rust では `std::ops` モジュールのトレイトを実装します。`+` なら `Add`、`-` なら `Sub` と、演算子ごとにトレイトが決まっています。

```rust
// Rust
use std::ops::Add;

struct Point { x: i32, y: i32 }

impl Add for Point {
    type Output = Point;
    fn add(self, other: Point) -> Point {
        Point { x: self.x + other.x, y: self.y + other.y }
    }
}

fn main() {
    let p = Point { x: 1, y: 2 };
    let q = Point { x: 3, y: 4 };
    let r = p + q;
    println!("{} {}", r.x, r.y); // 4 6
}
```

`impl Add for Point` が C++ の `operator+` に対応しています。トレイトの実装では `type Output` で戻り値の型を指定します。これは `p + q` の結果が何型になるかをコンパイラに伝えるものです。

`add` は `self` と `other` を値で受け取るため、`p + q` を書いた後、`p` と `q` は移動済みになります。そのまま使おうとするとコンパイルエラーになります。

```rust
// Rust（コンパイルエラー）
use std::ops::Add;

struct Point { x: i32, y: i32 }

impl Add for Point {
    type Output = Point;
    fn add(self, other: Point) -> Point {
        Point { x: self.x + other.x, y: self.y + other.y }
    }
}

fn main() {
    let p = Point { x: 1, y: 2 };
    let q = Point { x: 3, y: 4 };
    let r = p + q;
    println!("{} {}", p.x, p.y); // error: p は移動済み
}
```

```text
error[E0382]: borrow of moved value: `p`
```

小さな構造体であれば `#[derive(Clone, Copy)]` を付けるとコピーセマンティクスになり、`+` の後も `p` を使い続けられます。

```rust
// Rust
use std::ops::Add;

#[derive(Clone, Copy)]
struct Point { x: i32, y: i32 }

impl Add for Point {
    type Output = Point;
    fn add(self, other: Point) -> Point {
        Point { x: self.x + other.x, y: self.y + other.y }
    }
}

fn main() {
    let p = Point { x: 1, y: 2 };
    let q = Point { x: 3, y: 4 };
    let r = p + q;
    println!("{} {}", p.x, p.y); // 1 2：p はコピーされたので使える
    println!("{} {}", r.x, r.y); // 4 6
}
```

## よく使う演算子と対応する trait

### == と !=：PartialEq

C++ では `operator==` で等値比較を定義します。

```cpp
// C++
#include <iostream>

struct Point {
    int x, y;
    bool operator==(const Point& other) const {
        return x == other.x && y == other.y;
    }
};

int main() {
    Point a{1, 2}, b{1, 2}, c{3, 4};
    std::cout << std::boolalpha;
    std::cout << (a == b) << "\n"; // true
    std::cout << (a == c) << "\n"; // false
}
```

Rust では `PartialEq` トレイトを実装します。`PartialEq` を実装すると `==` と `!=` の両方が使えます。

```rust
// Rust
#[derive(PartialEq)]
struct Point { x: i32, y: i32 }

fn main() {
    let a = Point { x: 1, y: 2 };
    let b = Point { x: 1, y: 2 };
    let c = Point { x: 3, y: 4 };
    println!("{}", a == b); // true
    println!("{}", a == c); // false
}
```

`#[derive(PartialEq)]` はフィールドをひとつずつ比較する実装をコンパイラが自動生成します。

### < > <= >=：PartialOrd

C++ では C++20 から `<=>` 演算子で比較演算子を一括定義できます。`= default` を付けると `==`、`<`、`>`、`<=`、`>=` すべてを生成します。

```cpp
// C++
#include <compare>
#include <iostream>

struct Point {
    int x, y;
    auto operator<=>(const Point&) const = default; // C++20
};

int main() {
    Point a{1, 2}, b{3, 4};
    std::cout << std::boolalpha;
    std::cout << (a < b) << "\n"; // true
    std::cout << (a > b) << "\n"; // false
}
```

Rust では `PartialOrd` トレイトを使います。`PartialOrd` は `PartialEq` を前提とするため、セットで derive します。

```rust
// Rust
#[derive(PartialEq, PartialOrd)]
struct Point { x: i32, y: i32 }

fn main() {
    let a = Point { x: 1, y: 2 };
    let b = Point { x: 3, y: 4 };
    println!("{}", a < b);  // true
    println!("{}", a > b);  // false
}
```

`derive` による実装はフィールドを上から順に比較します。`x` が等しければ `y` を比較するという辞書順です。

```rust
// Rust
#[derive(PartialEq, PartialOrd)]
struct Point { x: i32, y: i32 }

fn main() {
    let a = Point { x: 1, y: 9 };
    let b = Point { x: 2, y: 0 };
    println!("{}", a < b); // true：x が 1 < 2 なので y は見ない

    let c = Point { x: 1, y: 2 };
    let d = Point { x: 1, y: 9 };
    println!("{}", c < d); // true：x が等しいので y の 2 < 9 で決まる
}
```

### println! での表示：Display

C++ では `operator<<` で `std::ostream` への出力形式を定義します。

```cpp
// C++
#include <iostream>

struct Point { int x, y; };

std::ostream& operator<<(std::ostream& os, const Point& p) {
    return os << "(" << p.x << ", " << p.y << ")";
}

int main() {
    Point p{3, 4};
    std::cout << p << "\n"; // (3, 4)
}
```

Rust では `std::fmt::Display` トレイトを実装します。`println!("{}", value)` がこのトレイトを使います。

```rust
// Rust
use std::fmt;

struct Point { x: i32, y: i32 }

impl fmt::Display for Point {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "({}, {})", self.x, self.y)
    }
}

fn main() {
    let p = Point { x: 3, y: 4 };
    println!("{}", p); // (3, 4)
}
```

`Display` は `derive` で自動生成できません。値をどのように文字列にするかはその型によって異なり、一律には決められないからです。
