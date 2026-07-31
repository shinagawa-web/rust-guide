# 並行性

## スレッドを立ち上げる

C++ でスレッドを起動するには `std::thread` に実行したい関数やラムダを渡します。渡した瞬間にスレッドが動き始め、呼び出し元は `join()` で終了を待ちます。

```cpp
// C++
#include <iostream>
#include <thread>

int main() {
    std::thread t([] {
        std::cout << "スレッドの中\n";
    });
    t.join(); // t が終わるまで待つ
    std::cout << "メインスレッドに戻った\n";
}
```

Rust では `thread::spawn` にクロージャを渡してスレッドを起動します。戻り値の `JoinHandle` を通じて終了を待ちます。

```rust
// Rust
use std::thread;

fn main() {
    let handle = thread::spawn(|| {
        println!("スレッドの中");
    });
    handle.join().unwrap(); // スレッドの終了を待つ
    println!("メインスレッドに戻った");
}
```

C++ では `std::thread` オブジェクト自身がスレッドのハンドルを兼ねますが、Rust では `spawn` が `JoinHandle` を返します。`join()` の戻り値は `Result` で、スレッドがパニックしていた場合は `Err` になります。

```rust
// Rust
use std::thread;

fn main() {
    let handle = thread::spawn(|| {
        panic!("スレッドの中でパニック");
    });

    match handle.join() {
        Ok(_) => println!("正常終了"),
        Err(_) => println!("スレッドがパニックした"),
    }
}
```

## mutex とデータが切り離せない

C++ では mutex と保護対象のデータは別々に宣言します。mutex をロックしなくてもデータに直接アクセスできます。

```cpp
// C++
#include <iostream>
#include <mutex>

int main() {
    std::mutex mtx;
    int counter = 0;

    // ロックせずに counter を操作できてしまう
    counter += 1;
    std::cout << "counter: " << counter << "\n";
}
```

Rust では `Mutex<T>` がデータを包みます。中の値にアクセスするには `.lock()` でロックを取得し、返ってくるガードを経由するしかありません。ロックを経由しない直接アクセスはコンパイルエラーになります。

```rust
// Rust（コンパイルエラー）
use std::sync::Mutex;

fn main() {
    let m = Mutex::new(0);
    println!("{}", m); // ロックせずに中身を触ろうとするとエラー
}
```

```
error[E0277]: `Mutex<i32>` doesn't implement `std::fmt::Display`
```

`.lock()` でロックを取得すると、ガード経由で中の値を操作できます。ガードがスコープを抜けると自動でアンロックされます。

```rust
// Rust
use std::sync::Mutex;

fn main() {
    let m = Mutex::new(0);
    {
        let mut n = m.lock().unwrap();
        *n += 1;
    } // ここでアンロック
    println!("値: {}", m.lock().unwrap()); // 値: 1
}
```

単体の `Mutex<T>` は所有者が一人なので複数スレッドに渡せません。共有するには `Arc` で包みます。Arc は Atomically Reference Counted の略で、参照カウントをアトミック操作で更新するスマートポインタです。`Arc::clone` でスレッドに渡すたびにカウントが増え、全スレッドが手放した時点でカウントがゼロになりデータが解放されます。

```rust
// Rust
use std::sync::{Arc, Mutex};
use std::thread;

fn main() {
    let counter = Arc::new(Mutex::new(0));
    let mut handles = vec![];

    for _ in 0..5 {
        let counter = Arc::clone(&counter); // スレッドに渡す前にクローン
        let handle = thread::spawn(move || {
            let mut n = counter.lock().unwrap();
            *n += 1;
        });
        handles.push(handle);
    }

    for h in handles {
        h.join().unwrap();
    }

    println!("結果: {}", counter.lock().unwrap()); // 結果: 5
}
```

## データ競合をコンパイルが防ぐ

C++ では、mutex なしで複数スレッドが同じ変数を同時に書き換えるコードはコンパイルを通ります。しかし実行すると結果は不定です。

```cpp
// C++
#include <iostream>
#include <thread>

int main() {
    int counter = 0;

    std::thread t1([&] {
        for (int i = 0; i < 1000; ++i) ++counter;
    });
    std::thread t2([&] {
        for (int i = 0; i < 1000; ++i) ++counter;
    });

    t1.join();
    t2.join();

    // コンパイルは通る。しかし counter の値は 2000 になるとは限らない
    std::cout << "counter: " << counter << "\n";
}
```

2つのスレッドが `++counter` を同時に実行すると、片方の更新がもう片方に上書きされることがあります。2000 になるとは限らず、実行のたびに値が変わり得ます。

Rust では、スレッドに渡せる型を `Send` トレイトで制限しています。`Send` はスレッド間で所有権を安全に移せる型に自動で付くマーカートレイトで、`thread::spawn` のクロージャにも要求されます。`Send` でない型をクロージャがキャプチャしていると、コンパイルエラーになります。

`Rc<RefCell<i32>>` を別のスレッドに渡そうとするだけでその制限に引っかかります。`Rc` は参照カウントをアトミックに更新しないため `Send` が実装されていません。

```rust
// Rust（コンパイルエラー）
use std::cell::RefCell;
use std::rc::Rc;
use std::thread;

fn main() {
    let data = Rc::new(RefCell::new(0));

    let data2 = Rc::clone(&data);
    let handle = thread::spawn(move || {
        *data2.borrow_mut() += 1;
    });

    handle.join().unwrap();
    println!("{}", data.borrow());
}
```

```
error[E0277]: `Rc<RefCell<i32>>` cannot be sent between threads safely
  = help: within `{closure}`, the trait `Send` is not implemented for `Rc<RefCell<i32>>`
note: required by a bound in `spawn`
  F: Send + 'static,
```

`thread::spawn` がクロージャに `Send` を要求しているためにエラーが出ます。`Rc` がスレッドをまたいで使えないことをコンパイラが静的に検出しています。共有に `Arc` を使うのは、`Arc` が参照カウントをアトミックに更新して `Send` を実装しているからです。`Rc` にはそれがありません。
