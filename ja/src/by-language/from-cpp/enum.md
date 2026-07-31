# enum と match

## タグがずれても型は気づかない

C++ の `union` は、複数のフィールドが同じメモリ領域を共有する仕組みです。そのうちどのフィールドが現在有効なのかを、コンパイラは追跡しません。間違ったフィールドを読んでもコンパイルが通り、動作は未定義になります。

```cpp
// C++
union Value {
    int i;
    float f;
};

int main() {
    Value v;
    v.i = 42;
    float x = v.f;  // 未定義動作。コンパイルは通る
}
```

「いま `i` が有効なのか `f` が有効なのか」を型として表すために、タグを付ける方法があります。

```cpp
// C++
struct Shape {
    enum Tag { Circle, Rect } tag;
    union {
        float radius;
        struct { float w, h; } rect;
    };
};
```

タグと `union` の整合性を守るのはプログラマの責任です。`tag` を更新し忘れて間違ったフィールドを読んでも、コンパイラは何も言いません。

C++17 では `std::variant` が導入され、タグの管理は安全になりました。

```cpp
// C++17
#include <variant>
#include <cmath>
#include <iostream>

struct Circle { float radius; };
struct Rect   { float w, h; };
using Shape = std::variant<Circle, Rect>;

float area(const Shape& s) {
    if (auto* c = std::get_if<Circle>(&s))
        return M_PI * c->radius * c->radius;
    if (auto* r = std::get_if<Rect>(&s))
        return r->w * r->h;
    return 0;
}

int main() {
    Shape s = Circle{1.5f};
    std::cout << area(s) << "\n";
}
```

ただし `std::get_if` で場合分けしても、バリアントを追加したときに対応漏れをコンパイラは検出しません。

```cpp
// C++17 — バリアントを追加した場合
#include <variant>
#include <cmath>
#include <iostream>

struct Circle   { float radius; };
struct Rect     { float w, h; };
struct Triangle { float base, height; };  // 追加

using Shape = std::variant<Circle, Rect, Triangle>;

float area(const Shape& s) {
    if (auto* c = std::get_if<Circle>(&s))
        return M_PI * c->radius * c->radius;
    if (auto* r = std::get_if<Rect>(&s))
        return r->w * r->h;
    return 0;   // Triangle を追加してもコンパイルは通る。面積は 0 が返る
}

int main() {
    Shape s = Triangle{3.0f, 4.0f};
    std::cout << area(s) << "\n";  // 0
}
```

## enum にデータを持たせる

Rust の `enum` は、各バリアントが独自のデータを持てます。先ほどの `Shape` に相当するコードは次のように書けます。

```rust
// Rust
fn main() {
    let s = Shape::Circle(1.5);
    println!("{}", area(&s));
}

enum Shape {
    Circle(f32),
    Rect(f32, f32),
}

fn area(s: &Shape) -> f32 {
    match s {
        Shape::Circle(r) => std::f32::consts::PI * r * r,
        Shape::Rect(w, h) => w * h,
    }
}
```

タグの管理はコンパイラが引き受けます。`Shape::Circle(1.5)` と書いた時点で、コンパイラはこのバリアントが `Circle` であり、内側に `f32` が一つあることを知っています。プログラマがタグを更新し忘れるという問題が、そもそも発生しません。

バリアントの中身を取り出すのに使っているのが `match` です。

`match` はパターンに対してブロックを対応させる式で、C++ の `switch` に見た目が似ています。ただし動作が二点違います。

一つはフォールスルーがないことです。C++ の `switch` はケースの末尾に `break` を書き忘れると、次のケースへそのまま流れ込みます。`match` はパターンごとに独立していて、`break` を書く必要もなく、次のケースに流れることもありません。

```cpp
// C++
switch (n) {
    case 1:
        printf("one\n");
        // break を忘れると "two" も出る
    case 2:
        printf("two\n");
        break;
    default:
        printf("other\n");
}
```

```rust
// Rust
fn main() {
    let n = 1;
    match n {
        1 => println!("one"),
        2 => println!("two"),
        _ => println!("other"),
    }
}
```

もう一つは網羅性の強制です。C++ の `switch` でケースを書き忘れても、コンパイルは通ります。`-Wswitch` を有効にしていればコンパイラが警告を出しますが、警告を無視したままビルドを続けられます。`match` は取りうるバリアントをすべて処理しないとコンパイルエラーになります。先の `area` 関数から `Rect` のケースを削除すると、コンパイルエラーになります。

```rust
// Rust（コンパイルエラー）
enum Shape {
    Circle(f32),
    Rect(f32, f32),
}

fn area(s: &Shape) -> f32 {
    match s {
        Shape::Circle(r) => std::f32::consts::PI * r * r,
        // Rect を削除
    }
}

fn main() {
    let s = Shape::Circle(1.5);
    println!("{}", area(&s));
}
```

```
error[E0004]: non-exhaustive patterns: `&Shape::Rect(_, _)` not covered
```

`enum` にバリアントを追加したとき、それを使うすべての `match` が自動的にエラーになります。対処しきれていないコードはコンパイルが通らないので、不完全な実装が動くコードとして出回ることがありません。
