# 並行性

TypeScript の並行は、async / await です。`await` で待っている間に別の処理へ切り替わり、いくつもの処理が少しずつ進んでいきます。ただし、実際に動いているのは一度に一つです。複数の処理が同じ変数を、同じ瞬間に書き換える、ということは起きません。だから、共有したデータが競合して壊れる、という心配を、TypeScript ではほとんどしてこなかったはずです。

Rust には、本当に同時に動くスレッドがあります。`thread::spawn` で起動した処理は、別の処理と同じ瞬間に走ります。すると、複数のスレッドが同じデータを同時に書き換えて壊す、という新しい危険が出てきます。Rust は、この「安全に共有できないデータの共有」を、コンパイルの時点で止めます。ここでも働くのは所有権です。所有権と借用をまだ見ていない人は、先に[所有権と借用](ownership.md)を読むと、この先が分かりやすくなります。

題材は、一つのカウンタを複数で増やす、という定番です。まず TypeScript から見ます。

## TypeScript の並行は、一度に一つ

非同期の処理を10個走らせて、それぞれ共有のカウンタを1増やします。

```ts
// TypeScript
let count = 0;

async function increment() {
  count++; // 10 個の処理が同じ count を書き換える
}

await Promise.all(Array.from({ length: 10 }, () => increment()));
console.log(count); // 必ず 10
```

`count++` は「読んで、1足して、書き戻す」の三手です。もし複数のスレッドで同時に走れば、この三手の途中で割り込まれ、二つのスレッドが同じ値を読んで同じ値を書き戻す、ということが起こりえます。でも TypeScript はシングルスレッドなので、動いているのは常に一つだけです。`count++` が途中で割り込まれることはなく、結果はいつも 10 になります。処理が切り替わるのは `await` のところだけで、`count++` の最中には起きません。

共有したデータで競合が起きないのは、そもそも同時に書き換えていないからでした。TypeScript の並行は、速く「切り替える」ものであって、本当に「同時に動かす」ものではありません。

## 安全でない共有を、コンパイルが止める

Rust のスレッドは、本当に同時に動きます。さきほどと同じ「10個でカウンタを増やす」を、スレッドで素朴に書くと、こうなります。

```rust
// Rust
use std::thread;

fn main() {
    let mut count = 0;
    let mut handles = vec![];
    for _ in 0..10 {
        handles.push(thread::spawn(|| {
            count += 1; // 別のスレッドから count を書き換えようとする
        }));
    }
    for h in handles {
        h.join().unwrap();
    }
    println!("{count}");
}
```

やろうとしていることを順に追うと、まず `thread::spawn` に処理を渡すと、それを新しいスレッドで走らせます。渡している `|| { count += 1 }` は、TypeScript の `() => { count += 1 }` にあたる無名関数で、`count` を1増やす処理です。これを `for` で10回くり返して10個のスレッドを起動し、`spawn` が返すハンドル（あとでスレッドの終了を待つための取っ手）を `handles` に集めます。最後の `for h in handles { h.join().unwrap() }` で、集めたスレッドが全部終わるのを待ってから、`count` を表示する、という段取りです。

ところが、これはコンパイルが通りません。

```text
error[E0373]: closure may outlive the current function, but it borrows `count`
```

これは「データ競合を見つけた」というエラーではなく、借用の寿命のエラーです。スレッドは起動した関数より長く生きるかもしれないので、その関数の `count` を借りたまま別スレッドへ持ち込むこと自体を、コンパイラが止めています。

Rust に「データ競合」という一発の検査があるわけではありません。所有権と借用のルールの積み重ねで、ロックなどの安全な仕組みを通さずに複数のスレッドから同じ可変データへ同時に手を出す形が、そもそも書けなくなっています。TypeScript では気にしなくてよかった競合が、Rust では安全な共有の形へ書き直すまで、先に進めません。

安全に共有するには、共有してよい形に包みます。`Arc` で複数のスレッドから持てるようにし、`Mutex` で同時に書き換えるのを一人ずつに絞ります。

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

コードを順に追います。`Arc::new(Mutex::new(0))` は、数値 `0` をまず `Mutex`（同時に書き換えるのを一人に絞る、鍵付きの箱）に入れ、それをさらに `Arc`（複数のスレッドで持てる共有の入れ物）で包んだものです。ループの中の `let count = Arc::clone(&count)` は、中身の `0` ではなく、その入れ物の持ち手だけを複製します。スレッドごとに持ち手を一つずつ用意し、`move` でそれをスレッドへ渡すので、10個のスレッドが同じ一つの数値を、それぞれの持ち手ごしに指します。

スレッドの中の `count.lock()` が、その鍵を取る操作です。鍵を取れたスレッドだけが中の数値を書き換えられ、`*n += 1` で1増やします。ほかのスレッドは、その間は `lock()` のところで順番を待ちます。増やし終えて `n` が役目を終えると鍵はひとりでに戻り、次のスレッドが入れます。こうして、同時に書き換えるのを一人ずつに絞っています。

`Mutex` を通さない限り中の数値は書き換えられないので、ロックの付け忘れが起きません。TypeScript では、そもそも同時に書き換えないから競合しませんでした。Rust では、本当に同時に動かしたうえで、共有するデータには安全な仕組みを必ず通す形を強制して、競合を防ぎます。結果はいつも 10 です。

## channel は、値を所有権ごと渡す

共有して同時に書き換えるのとは別に、値を相手へ「渡してしまう」やり方もあります。TypeScript で実際に並列で動かすなら Web Worker です。別スレッドで動く worker とはメモリを共有せず、`postMessage` で値を送り合います。

```ts
// TypeScript（呼び出す側）
const worker = new Worker("./worker.js");

worker.postMessage("できたよ"); // worker へ値を送る（共有ではなくコピーが渡る）
worker.onmessage = (e) => {
  console.log(e.data);          // worker からの返事を受け取る
};
```

```ts
// TypeScript（worker.js の中身）
onmessage = (e) => {
  postMessage(e.data); // 受け取った値を、そのまま送り返す
};
```

この例のような通常の値を渡すと、`postMessage` はそのコピーを送り、メモリそのものは共有されません。送り手側と worker 側が持つのは別々のコピーなので、同じデータを二人で同時に書き換える、という形になりません。

Rust の channel も、この「共有せず渡す」発想です。片方から送り、もう片方で受け取ります。

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

ただし、送ったあとの元の値の扱いが違います。`postMessage` は基本、値のコピーを相手へ渡します。だから送り手側には自分のぶんが残り、送ったあともそのまま使えます。

```ts
// TypeScript
const data = { text: "できたよ" };
worker.postMessage(data);
console.log(data.text); // 送ったあとも data は手元に残っていて、そのまま使える
```

Rust の channel は、送った値を所有権ごと相手へ渡します。手元には残らないので、送ったあとに同じ値を使おうとすると、コンパイルエラーになります。

```rust
// Rust
let msg = String::from("できたよ");
tx.send(msg).unwrap();
println!("{msg}"); // コンパイルエラー: borrow of moved value: `msg`
```

挙動は逆ですが、どちらも安全です。仕組みが違うからです。TypeScript はデータを複製して渡すので、送り手と worker はそれぞれ別のコピーを持ちます。共有しているものが無いので、送り手が自分のコピーをそのまま使っても競合は起きません。Rust は複製せず、値そのものを手渡します。値は一つのままなので、もし送り手にも使えるままにすると、送り手と受け手が同じ一つの値を同時にいじれてしまう。だから送ったあとは使えなくして、持ち主を一人に保ちます。

複製する TypeScript も、手渡す Rust も、ねらいは同じで、同じデータを二人が同時に書き換える形を作らないことです。コピーが欲しければ、Rust でも送る前に `clone` すれば、TypeScript と同じように手元へ残せます。

TypeScript の並行が「一度に一つ」で競合を避けていたのに対し、Rust は本当に同時に動かしたうえで、安全に共有できないデータの共有をコンパイル時に止めます。所有権が、メモリだけでなく並行性でも競合を防いでいます。

次のページで、TypeScript から見てきた違いをまとめて振り返ります。
