# 並行性

C言語 でスレッドを使うとき、POSIX の `pthread` を使ってきました。スレッドを作り、共有のデータは `mutex` で保護する。Rust にもスレッドと `Mutex` があり、見た目はよく似ています。違うのは、mutex のかけ忘れをコンパイル時に防げるかどうかです。この章では、C と Rust の並行処理の書き方を並べて、何が変わるかを見ます。

## C の pthread — 保護はプログラマ任せ

C でカウンタを複数スレッドからインクリメントするには、`pthread_mutex_t` でカウンタを保護します。

```c
// C
#include <stdio.h>
#include <pthread.h>

int counter = 0;
pthread_mutex_t mutex = PTHREAD_MUTEX_INITIALIZER;

void *increment(void *arg) {
    for (int i = 0; i < 100000; i++) {
        pthread_mutex_lock(&mutex);
        counter++;
        pthread_mutex_unlock(&mutex);
    }
    return NULL;
}

int main(void) {
    pthread_t t1, t2;
    pthread_create(&t1, NULL, increment, NULL);
    pthread_create(&t2, NULL, increment, NULL);
    pthread_join(t1, NULL);
    pthread_join(t2, NULL);
    printf("%d\n", counter); // 200000
}
```

`pthread_mutex_lock` を忘れると、2つのスレッドが同時に `counter++` を実行するデータ競合が起きます。コンパイルは通り、実行するたびに結果が変わります。

```c
// C — mutex を忘れた場合
void *increment(void *arg) {
    for (int i = 0; i < 100000; i++) {
        counter++; // mutex なし — データ競合
    }
    return NULL;
}
```

`counter` が 200000 にならず、実行のたびに違う値が出ます。コンパイラは何も言いません。

## Rust のスレッドと Mutex — ロックしないとデータに触れない

Rust でも同じことができます。スレッドは `std::thread::spawn`、共有データは `Mutex<T>` で包みます。

```rust
// Rust
use std::sync::{Arc, Mutex};
use std::thread;

fn main() {
    let counter = Arc::new(Mutex::new(0));

    let c1 = Arc::clone(&counter);
    let t1 = thread::spawn(move || {
        for _ in 0..100000 {
            *c1.lock().unwrap() += 1;
        }
    });

    let c2 = Arc::clone(&counter);
    let t2 = thread::spawn(move || {
        for _ in 0..100000 {
            *c2.lock().unwrap() += 1;
        }
    });

    t1.join().unwrap();
    t2.join().unwrap();
    println!("{}", counter.lock().unwrap()); // 200000
}
```

C の `pthread_mutex_lock` → `pthread_mutex_unlock` に相当するのが `.lock()` です。`.lock()` はロックを取得して中のデータへの参照を返し、その参照がスコープを抜けると自動的にアンロックします。

C との大きな違いは、`Mutex` をかけなければカウンタの中身に触れない構造になっていることです。`counter` は `Mutex<i32>` 型で、`i32` が `Mutex` の中に入っています。`.lock()` を呼ばずに中の値を読み書きする方法がないので、ロック忘れはコンパイル時に防がれます。

```rust
// Rust
use std::sync::Mutex;

fn main() {
    let counter = Mutex::new(0);
    *counter += 1; // エラー: type `Mutex<i32>` cannot be dereferenced
}
```

`Arc` は複数のスレッドで一つのデータの所有権を共有するための型です。`Arc::clone` で参照カウントを増やし、各スレッドに渡しています。

---

C の `pthread` は mutex のかけ忘れをコンパイラが検知しません。Rust の `Mutex<T>` はデータを型の中に閉じ込め、ロックしなければアクセスできない構造にすることで、データ競合をコンパイル時に防ぎます。次の章では、`make` やヘッダファイルの手動管理から、Cargo によるビルドに移ります。
