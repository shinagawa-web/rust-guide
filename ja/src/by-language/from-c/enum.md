# union の代わりに enum と match

C言語 では、複数の型のうちどれか一つを持つデータを表すとき、`union` にタグを添えて使っていました。Rust の `enum` はタグと値をまとめて一つの型として持ちます。この章では、C と Rust の書き方を並べて、何が変わるかを見ます。

## C の tagged union — タグは自分で管理する

C の `union` は、同じメモリ領域を複数の型で共有します。`float` と `int` を同じ場所に置き、どちらとして読むかはプログラマが決めます。「今どの型が入っているか」を別に持つ必要があり、慣習的に `enum` や `int` のタグを `struct` と組み合わせて使います。

```c
// C
#include <stdio.h>

typedef enum { TYPE_INT, TYPE_FLOAT } Tag;

typedef struct {
    Tag tag;
    union {
        int   i;
        float f;
    } value;
} Number;

void print_number(Number n) {
    if (n.tag == TYPE_INT) {
        printf("int: %d\n", n.value.i);
    } else {
        printf("float: %f\n", n.value.f);
    }
}

int main(void) {
    Number a = { .tag = TYPE_INT,   .value.i = 42  };
    Number b = { .tag = TYPE_FLOAT, .value.f = 3.14f };
    print_number(a);
    print_number(b);
}
```

タグと値の整合はプログラマが守ります。`tag` を `TYPE_INT` にしたまま `value.f` を読んでも、コンパイルは通ります。

```c
// C
int main(void) {
    Number n = { .tag = TYPE_INT, .value.i = 42 };
    printf("%f\n", n.value.f); // 0.000000 — 42 のビット列を float として読んだ値
}
```

`42` の int ビット列を float として解釈した値が出力されます。タグが `TYPE_INT` であることをコンパイラは関知しません。

## Rust の enum — タグと値をまとめて持つ

Rust の `enum` はバリアントが値を持てます。C で `struct` + `union` + タグ用 `enum` の三つを組み合わせていたものが、一つの `enum` に収まります。値を取り出すには `match` を使います。`Int` のとき `Float` の中身を読もうとすると、コンパイルエラーになります。

```rust
// Rust
enum Number {
    Int(i32),
    Float(f32),
}

fn print_number(n: Number) {
    match n {
        Number::Int(i)   => println!("int: {i}"),
        Number::Float(f) => println!("float: {f}"),
    }
}

fn main() {
    let a = Number::Int(42);
    let b = Number::Float(3.14);
    print_number(a);
    print_number(b);
}
```

`match` はすべてのバリアントを網羅しなければコンパイルが通りません。C の `if` や `switch` でタグの確認を忘れても通っていたところが、Rust では飛ばせません。

バリアントを追加したとき、既存の `match` がコンパイルエラーになるので、対応し忘れも防げます。

```rust
// Rust — バリアントを追加した場合
enum Number {
    Int(i32),
    Float(f32),
    Complex(f32, f32), // 追加
}

fn print_number(n: Number) {
    match n {
        Number::Int(i)   => println!("int: {i}"),
        Number::Float(f) => println!("float: {f}"),
        // Complex を書かないとコンパイルエラー:
        // error[E0004]: non-exhaustive patterns: `Number::Complex(_, _)` not covered
    }
}

fn main() {}
```

---

C の tagged union はタグと値の整合をプログラマが守り、取り違えてもコンパイルが通りました。Rust の `enum` はタグと値をまとめて一つの型として持ち、`match` ですべてのバリアントを網羅しなければコンパイルが通りません。バリアントを追加したとき、対応し忘れた `match` もコンパイルエラーになります。次の章では、`void*` と関数ポインタで手作りしていた汎用を、trait とジェネリクスに置き換えます。
