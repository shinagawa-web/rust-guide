# 並行性

Go の並行性は goroutine と channel です。`go f()` と書けば関数を並行に走らせ、channel で値を受け渡す。Rust にも、スレッドを起動する `thread::spawn` と、値を送り合う channel があり、書き方の見た目はよく似ています。

大きく違うのは一点です。Go では、複数の goroutine が同じデータに同時に触れて競合しても、コンパイルは通ります。壊れるとしたら実行時で、しかも毎回ではなく、タイミング次第です。Rust は、スレッド間で安全に共有できないデータの共有を、コンパイルの時点で止めます。所有権が、並行性でも働きます。所有権と借用をまだ見ていない人は、先に[所有権と借用](ownership.md)を読むと、この先が分かりやすくなります。

題材は、複数のスレッドで一つのカウンタを増やす、という定番です。

## Go: 起動は手軽、競合は自分で防ぐ

goroutine を10個起動して、それぞれ共有のカウンタを1増やします。

```go
// Go
count := 0
var wg sync.WaitGroup
for i := 0; i < 10; i++ {
    wg.Add(1)
    go func() {
        defer wg.Done()
        count++ // 10 個の goroutine が同じ count を触る
    }()
}
wg.Wait()
fmt.Println(count) // 10 になるとは限らない
```

`count++` は「読んで、1足して、書き戻す」の三手です。複数の goroutine がこれを同時にやると、二つが同じ値（たとえば 5）を読み、どちらも 6 を書き戻す、ということが起きます。二回ぶんの加算が一回ぶんにしかならず、結果が 10 より小さくなることがあります。直すには `sync.Mutex` でロックしますが、付け忘れてもコンパイルは通ります。競合しているかどうかは、実行時に `-race` を付けて走らせて、はじめて分かります。

## Rust: 安全でない共有を、コンパイルが止める

同じことを Rust で素朴に書くと、こうなります。

```rust
// Rust
use std::thread;

fn main() {
    let mut count = 0;
    let mut handles = vec![];
    for _ in 0..10 {
        handles.push(thread::spawn(|| {
            count += 1; // 別のスレッドから count を触ろうとする
        }));
    }
    for h in handles {
        h.join().unwrap();
    }
    println!("{count}");
}
```

これはコンパイルが通りません。

```
error[E0373]: closure may outlive the current function, but it borrows `count`
```

これは「データ競合を見つけた」というエラーではなく、借用の寿命のエラーです。スレッドは起動した関数より長く生きるかもしれないので、その関数の `count` を借りたまま別スレッドへ持ち込むこと自体を、コンパイラが止めています。

Rust に「データ競合」という一発の検査があるわけではありません。所有権と借用のルールの積み重ねで、ロックなどの安全な仕組みを通さずに、複数のスレッドから同じ可変データへ触る形が、そもそも書けなくなっています。だから、Go では自分で気をつけていた競合が、Rust では安全な共有の形へ書き直すまで、先に進めません。

安全に共有するには、共有してよい形に包みます。`Arc` で複数のスレッドから持てるようにし、`Mutex` で同時に触るのを一人ずつに絞ります。

```rust
// Rust
use std::sync::{Arc, Mutex};
use std::thread;

fn main() {
    let count = Arc::new(Mutex::new(0));
    let mut handles = vec![];
    for _ in 0..10 {
        let count = Arc::clone(&count);
        handles.push(thread::spawn(move || {
            let mut n = count.lock().unwrap();
            *n += 1;
        }));
    }
    for h in handles {
        h.join().unwrap();
    }
    println!("{}", *count.lock().unwrap()); // 10
}
```

`Mutex` を通さない限り中の数値には触れないので、ロックの付け忘れが起きません。Go では自分で気をつけて `Mutex` を足す約束でしたが、Rust ではロック無しに共有すること自体ができません。結果はいつも 10 です。

## channel は、値を所有権ごと渡す

値の受け渡しは、Go の channel と同じ形で書けます。送り手と受け手を作り、片方から送り、もう片方で受け取ります。

```go
// Go
ch := make(chan string)
go func() {
    ch <- "できたよ"
}()
msg := <-ch
fmt.Println(msg)
```

Rust も同じ流れです。

```rust
// Rust
use std::sync::mpsc;
use std::thread;

fn main() {
    let (tx, rx) = mpsc::channel();
    thread::spawn(move || {
        tx.send(String::from("できたよ")).unwrap();
    });
    let msg = rx.recv().unwrap();
    println!("{msg}"); // できたよ
}
```

違うのは、送った値の所有権も相手へ渡ることです。送ったあとに、送り手側で同じ値を使おうとすると、コンパイルエラーになります。

```rust
// Rust
let msg = String::from("できたよ");
tx.send(msg).unwrap();
println!("{msg}"); // コンパイルエラー: borrow of moved value: `msg`
```

共有ではなく受け渡しなので、ここでも競合は起きません。

起動も受け渡しも、書き方は Go に似ています。違うのは、安全に共有できないデータの共有を、Rust がコンパイル時に止めること。所有権が、メモリだけでなく並行性でも競合を防いでいます。

次のページで、Go から見てきた違いをまとめて振り返ります。
