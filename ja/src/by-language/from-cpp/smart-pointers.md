# スマートポインタ

C++ では `new` で確保したメモリの解放はプログラマの責任です。C との FFI や低レイヤのコードでは今も生ポインタを直接扱います。一方、所有権の管理をコンパイラに任せたい場面のために、`unique_ptr`（一人の所有者が解放まで責任を持つ）や `shared_ptr`（参照カウントで複数の所有者を持てる）が C++11 で導入されました。Rust にも同じ問題意識に対応する仕組みがあります。

## ヒープに置いて自動解放する

`new` と `delete` は対で書く必要があります。しかし、例外が飛んだり早期リターンしたりすると、`delete` を書いてあっても実行されずにリークします。

```cpp
// C++
#include <string>

void process(bool fail) {
    std::string* s = new std::string("hello");
    if (fail) {
        return;   // delete を書いてあっても実行されない → リーク
    }
    delete s;
}
```

この問題を解くために導入されたのが `unique_ptr` です。デストラクタで自動的に `delete` を呼ぶので、どのパスで抜けても解放が保証されます。

```cpp
// C++
#include <memory>
#include <string>

void process(bool fail) {
    auto s = std::make_unique<std::string>("hello");
    if (fail) {
        return;   // スコープを抜けると自動解放
    }
}   // ここでも自動解放
```

Rust では、`String` のようなヒープを持つ型も、所有者がスコープを抜けると自動的に解放されます。

```rust
// Rust
fn process(fail: bool) {
    let s = String::from("hello");
    if fail {
        return;   // スコープを抜けると自動解放
    }
    println!("{s}");
}   // ここでも自動解放

fn main() {
    process(false);
}
```

所有者がスコープを抜けると、型の後始末が自動で走ります。`String` に限らず、ヒープを持つすべての型に当てはまります。

## 所有者を複数にする

`Server` と `Logger` が同じ `Config` を使う場面を考えます。`Server` と `Logger` はどちらが先にスコープを抜けるかわからないので、どちらかに所有権を渡しきるわけにはいきません。`unique_ptr` はムーブ専用なので、二つに渡すことはできません。

```cpp
// C++
#include <memory>

struct Config {};

int main() {
    auto config = std::make_unique<Config>();
    auto server_config = config;   // コンパイルエラー: unique_ptr はコピー不可
}
```

この問題を解くのが `shared_ptr` です。参照カウントを持ち、`shared_ptr` をコピーするたびにカウントが増え、ゼロになった時点でオブジェクトが解放されます。

```cpp
// C++
#include <memory>

struct Config {};

int main() {
    auto config = std::make_shared<Config>();
    auto server_config = config;   // 参照カウントが 1 → 2
    auto logger_config = config;   // 参照カウントが 2 → 3
    // server_config も logger_config も Config を使える
    // 参照カウントが 0 になった時点で解放される
}
```

Rust で同じ問題を解くには `Rc<T>` を使います。`Rc` は "Reference Counted" の略で、参照カウントで複数の所有者を管理します。

```rust
// Rust
use std::rc::Rc;

struct Config {}

fn main() {
    let config = Rc::new(Config {});
    let server_config = Rc::clone(&config);   // 参照カウントが 1 → 2
    let logger_config = Rc::clone(&config);   // 参照カウントが 2 → 3
    // server_config も logger_config も Config を使える
    // 参照カウントが 0 になった時点で解放される
}
```

`Rc::clone(&a)` はヒープ上の文字列をコピーするわけではありません。内部の参照カウントを増やすだけです。`x.clone()` と書くこともできますが、`Rc::clone(&x)` という形を使うと「ここでは深いコピーではなくカウントの増加が起きている」という意図がコードから読み取れます。

所有者がスコープを抜けるとカウントが減り、ゼロになった時点でヒープ上のオブジェクトが解放されます。

```rust
// Rust
use std::rc::Rc;

fn main() {
    let a = Rc::new(String::from("hello"));
    println!("{}", Rc::strong_count(&a));   // 1
    {
        let b = Rc::clone(&a);
        println!("{}", Rc::strong_count(&a));   // 2
    }   // b がスコープを抜け、カウントが 2 → 1
    println!("{}", Rc::strong_count(&a));   // 1
}
```

ただし、`Rc<T>` はスレッドをまたいで使えません。C++ の `shared_ptr` はコピーを別スレッドに渡せます。

```cpp
// C++
#include <iostream>
#include <memory>
#include <string>
#include <thread>

int main() {
    auto a = std::make_shared<std::string>("hello");
    auto b = a;    // 参照カウントがアトミックに増える
    std::thread t([b]() {
        std::cout << *b << "\n";
    });
    t.join();
}
```

Rust の `Rc<T>` で同じことをしようとすると、コンパイルエラーになります。

```rust
// Rust（コンパイルエラー）
use std::rc::Rc;
use std::thread;

fn main() {
    let a = Rc::new(String::from("hello"));
    let b = Rc::clone(&a);
    thread::spawn(move || {
        println!("{b}");
    });
}
```

```text
error[E0277]: `Rc<String>` cannot be sent between threads safely
  = help: within `...`, the trait `Send` is not implemented for `Rc<String>`
```

なぜ `Send` が実装されていないと問題なのかは、次のセクションで説明します。

## スレッドをまたいで共有する

`Rc<T>` がスレッド間で使えない理由は、参照カウントの実装にあります。`Rc<T>` のカウントは普通の整数で、増やすときは「現在の値を読む・1を足す・書き戻す」という三手順を踏みます。この途中で別スレッドが割り込める隙があるため、二つのスレッドが同時に同じカウントを読んでそれぞれ足すと、一方の更新が消えてカウントがずれます。カウントが実際の参照数より少なく見えるとオブジェクトが早期解放され、多く見えると永久に解放されません。Rust はこの危険を `Send` トレイトを使ってコンパイル時に防いでいます。

`Rc<T>` の代わりに `Arc<T>` を使うと、スレッドをまたいで複数の所有者を持てます。Arc は "Atomically Reference Counted" の略で、参照カウントの増減に CPU レベルのアトミック命令を使います。ソフトウェアのロックと違い他スレッドを待たせませんが、ハードウェアが操作の完結を保証するため、複数スレッドから安全にアクセスできます。

使い方は `Rc<T>` と同じです。`use std::sync::Arc;` に変えて、`Rc::new` を `Arc::new` に、`Rc::clone` を `Arc::clone` に置き換えるだけです。

```cpp
// C++
#include <iostream>
#include <memory>
#include <string>
#include <thread>

int main() {
    auto a = std::make_shared<std::string>("hello");
    auto b = a;    // カウントの増減はアトミック
    std::thread t([b]() {
        std::cout << *b << "\n";
    });
    t.join();
}
```

```rust
// Rust
use std::sync::Arc;
use std::thread;

fn main() {
    let a = Arc::new(String::from("hello"));
    let b = Arc::clone(&a);   // 参照カウントがアトミックに増える
    let handle = thread::spawn(move || {
        println!("{b}");
    });
    handle.join().unwrap();
}
```

アトミック命令は通常の整数演算より遅く、スレッドをまたがない場面では不要なコストです。Rust がスレッドをまたぐ場合は `Arc<T>`、またがない場合は `Rc<T>` と分けているのは、このコストを必要なときだけ払えるようにするためです。C++ の `shared_ptr` はカウントの増減が常にアトミックなので、シングルスレッドのプログラムでもそのコストを毎回払います。
