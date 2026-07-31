# C・C++ との相互運用

## unsafe が必要な操作

C++ では、生ポインタを dereference したり、C で書かれた関数を呼んだりするのに特別な構文は要りません。どちらも普通のコードの中に書けます。ただし、null ポインタやダングリングポインタを dereference した場合の動作は未定義で、クラッシュやメモリ破壊につながります。

```cpp
// C++（未定義動作）
#include <iostream>

int main() {
    int* p = nullptr;
    std::cout << *p << "\n"; // null dereference：実行時クラッシュ
}
```

コンパイルは通ります。問題は実行時に初めて現れます。有効なポインタであれば dereference は正常に動きます。

```cpp
// C++
#include <iostream>

int main() {
    int n = 42;
    int* p = &n;
    std::cout << *p << "\n"; // 42
}
```

Rust でも `*const T` や `*mut T` という生ポインタ型を持てます。ただし、その生ポインタを dereference することはできません。コンパイラは、その操作が安全かどうかを静的に保証できないからです。

```rust
// Rust（コンパイルエラー）
fn main() {
    let n: i32 = 42;
    let p = &n as *const i32;
    println!("{}", *p);   // unsafe ブロックの外では dereference できない
}
```

```text
error[E0133]: dereference of raw pointer is unsafe and requires unsafe block
 --> src/main.rs:4:20
  |
4 |     println!("{}", *p);
  |                    ^^ dereference of raw pointer
  |
  = note: raw pointers may be null, dangling or unaligned; they can violate aliasing rules and cause data races: all of these are undefined behavior
```

`unsafe` ブロックで囲むと、dereference が許可されます。

```rust
// Rust
fn main() {
    let n: i32 = 42;
    let p = &n as *const i32;
    let val = unsafe { *p };   // unsafe ブロック内でのみ許可される
    println!("{val}");
}
```

`unsafe` ブロックは「ここから先の正しさは自分で保証する」という宣言です。unsafe な操作は `unsafe` ブロックの外では書けません。`unsafe` を書いても借用チェックや型チェックは動き続けます。コンパイラからプログラマに移るのは、ポインタの null・ダングリング・エイリアスに関する安全性の責任だけです。

同じルールが `unsafe` 関数の呼び出しにも適用されます。`unsafe fn` と宣言された関数は、`unsafe` ブロックの外から呼ぶとコンパイルエラーになります。

```rust
// Rust（コンパイルエラー）
unsafe fn double(n: i32) -> i32 {
    n * 2
}

fn main() {
    let result = double(21);   // unsafe ブロックの外では呼べない
    println!("{result}");
}
```

```text
error[E0133]: call to unsafe function `double` is unsafe and requires unsafe block
 --> src/main.rs:6:18
  |
6 |     let result = double(21);
  |                  ^^^^^^^^^^ call to unsafe function
  |
  = note: consult the function's documentation for information on how to avoid undefined behavior
```

```rust
// Rust
unsafe fn double(n: i32) -> i32 {
    n * 2
}

fn main() {
    let result = unsafe { double(21) };
    println!("{result}");
}
```

`unsafe fn` という宣言は「この関数を呼ぶ側が、呼び出しの前提条件を満たす責任を負う」という表明です。C ライブラリの関数を Rust から呼ぶには、その関数を `unsafe fn` として宣言してから `unsafe` ブロック経由で呼びます。具体的な宣言の書き方は次のセクションで扱います。

## C の関数を呼ぶ

ABI（Application Binary Interface）は、関数をバイナリレベルでどう呼び出すかの規約です。引数をレジスタで渡すかスタックで渡すか、関数名をどう表現するかなどが決まっています。C の ABI はシンプルで各言語が広くサポートしており、異言語間の橋渡しに使われます。

C++ は C と ABI を共有しているので、`<cstring>` をインクルードするだけで C の `strlen` を呼べます。ヘッダー内で `extern "C"` リンケージがすでに指定されているため、呼び出し側には何も書く必要がありません。

```cpp
// C++
#include <cstring>
#include <iostream>

int main() {
    const char* s = "hello";
    std::cout << strlen(s) << "\n"; // 5
}
```

Rust では、C の関数を呼ぶ前に `extern "C"` ブロックでそのシグネチャを宣言します。C の `char` に対応する型として `std::ffi::c_char` を使います。宣言した関数は `unsafe fn` と同じ扱いになるため、呼び出しには `unsafe` ブロックが必要です。

```rust
// Rust
use std::ffi::c_char;

extern "C" {
    fn strlen(s: *const c_char) -> usize;
}

fn main() {
    let len = unsafe { strlen(c"hello".as_ptr()) };
    println!("{len}"); // 5
}
```

`c"hello"` は C 文字列リテラルで、末尾に null バイトを自動で付加します。`.as_ptr()` が返す型はすでに `*const c_char` なので、キャストなしで `strlen` に渡せます。

`extern "C"` ブロックの宣言は「この名前・この型の関数が、C ABI でリンクされた場所に存在する」というプログラマの保証です。宣言と実際のシグネチャがずれていると未定義動作になります。`unsafe` ブロックを書くことは、この保証を自分で満たすことを意味します。

## C++ との相互運用

前のセクションで扱った `extern "C"` は、C ABI に従った関数にしか使えません。C++ の関数は名前マングリングと呼ばれる変換によってシンボル名が変わり、`void greet()` は `_Z5greetv` のような形になります。変換規則はコンパイラ実装に依存するため、C ABI から名前で参照できません。`std::string` のような C++ 固有の型には C ABI での表現がなく、引数や戻り値にそうした型が含まれる関数は `extern "C"` ブロックに書けません。クラスのメソッドになると、オブジェクトのレイアウトや仮想関数テーブルなど、C ABI がカバーしない要素がさらに絡んできます。

`cxx` クレートはこの問題に対処するための専用ツールです。`#[cxx::bridge]` マクロで Rust と C++ の境界を一箇所に定義すると、cxx が C++ 側のヘッダーと突き合わせてシグネチャの整合性をコンパイル時に検証します。

```rust
// Rust 側（lib.rs）
#[cxx::bridge]
mod ffi {
    unsafe extern "C++" {
        include!("mylib.h");
        fn greet(name: &str) -> String;
    }
}
```

`unsafe extern "C++"` ブロックに並ぶ宣言は、cxx が C++ ヘッダーと照合するため、宣言と実体のシグネチャがずれていればコンパイルエラーになります。`unsafe` はブロックレベルの宣言で、呼び出し側には不要です。

```rust
// Rust 側（main.rs）
fn main() {
    let msg = ffi::greet("world"); // unsafe ブロック不要
    println!("{msg}");
}
```

前のセクションで `unsafe { strlen(...) }` と書いたのとは対照的です。cxx は C++ のクラス型やメソッドも扱えます。詳細は [cxx.rs](https://cxx.rs) のチュートリアルを参照してください。

ただし cxx を使うには `build.rs` に `cxx-build` の設定を追加し、C++ ヘッダーを用意する必要があります。単一ファイルの `fn main()` だけでは動作しない点は注意してください。
