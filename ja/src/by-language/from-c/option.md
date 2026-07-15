# NULL の代わりに Option

C言語 で「値が無いかもしれない」を表すときは、ポインタの `NULL` を使ってきました。関数が探し物を見つけられなかったら `NULL` を返す、確保に失敗したら `NULL` を返す。呼ぶ側は、返ってきたポインタが `NULL` かどうかを自分で確かめてから使います。この章では、その `NULL` を Rust がどう置き換えるかを見ます。

## C のヌルポインタ — 型が同じで、確認はプログラマ任せ

C のポインタは、有効なアドレスを指すこともあれば、`NULL`（どこも指さない）のこともあります。問題は、その二つが同じ型だということです。`int *` と書いた変数は、生きた `int` を指しているのか `NULL` なのか、型からは区別が付きません。

```c
// C
int *find(int *xs, size_t len, int target) {
    for (size_t i = 0; i < len; i++) {
        if (xs[i] == target) {
            return &xs[i]; // 見つかった：その要素を指すポインタ
        }
    }
    return NULL;           // 見つからない：NULL
}
```

`find` の戻り値は `int *` です。見つかったときのポインタも、見つからなかったときの `NULL` も、同じ `int *` として返ってきます。だから受け取る側は、中身を使う前に `NULL` かどうかを確かめる決まりになっています。

```c
// C
int *p = find(xs, len, 42);
if (p != NULL) {   // 確かめてから
    printf("%d\n", *p);
}
```

やっかいなのは、この確認を忘れてもコンパイルが通ることです。`NULL` かもしれないポインタを、確かめずにそのまま参照できてしまいます。

```c
// C
int *p = find(xs, len, 42);
printf("%d\n", *p); // p が NULL だと、NULL の指す先を読む
```

`find` が見つけられずに `NULL` を返していると、`*p` は `NULL` の指す先を読みにいきます。これがヌルポインタ参照（ヌルデリファレンス）で、C の標準では未定義動作です。多くの環境では、その場でクラッシュ（SIGSEGV）として表に出ます。コンパイラは「確かめてから使え」とは言ってくれません。確認するかどうかは、最後までプログラマ任せでした。`NULL` を返す関数は標準ライブラリにもたくさんあり（`malloc`、`fopen`、`strchr` など）、その一つ一つで確認を忘れないよう気を張る必要がありました。

## Rust の Option — 「無いかもしれない」を別の型にする

Rust の参照 `&T` には、`NULL` にあたるものがありません。`&T` と書いたら、それは必ず生きた `T` を指しています。では「値が無いかもしれない」はどう表すのか。C のように既存の型へ `NULL` を紛れ込ませるのではなく、`Option<T>` という別の型で表します。

`Option<T>` は、次の二つのどちらかを持つ型です。

- `Some(T)` — 値がある。中に `T` が入っている
- `None` — 値がない

さきほどの `find` を Rust で書くと、戻り値の型が `Option<&i32>` になります。見つかれば `Some(参照)`、見つからなければ `None` です。

```rust
// Rust
fn find(xs: &[i32], target: i32) -> Option<&i32> {
    for x in xs {
        if *x == target {
            return Some(x); // 見つかった：参照を Some で包む
        }
    }
    None                    // 見つからない：None
}
```

C の `int *` は、有効なポインタも `NULL` も同じ型でした。Rust の `Option<&i32>` は違います。`Some(&i32)` と `None` は、`Option<&i32>` という一つの型の中の二つの状態で、しかも「中身のある `Some`」と「中身のない `None`」がはっきり分かれています。「無いかもしれない」ことが、型の名前に出ています。

3章の最後に出てきた `.get()` が、まさにこれを返していました。範囲外なら `None`、あれば `Some(要素)`。あのとき `match` で `Some` と `None` を分けたのが、`Option` の扱い方そのものです。

## 中身は、確かめてからしか使えない

`Option<T>` の `T` は、`Some` の中に入っています。取り出すには `Some` を開けなければならず、`None` のときには開けるものがありません。だから Rust では、中身を使う前に「`Some` なのか `None` なのか」を必ず場合分けさせられます。C で確認を忘れられたところが、Rust では飛ばせません。

場合分けは `match` で書けます。

```rust
// Rust
fn main() {
    let xs = [10, 20, 30];

    match find(&xs, 20) {
        Some(x) => println!("見つかった: {x}"), // Some のときだけ、中身の x が使える
        None => println!("見つからない"),        // None のときは中身が無い
    }
}
# fn find(xs: &[i32], target: i32) -> Option<&i32> {
#     for x in xs { if *x == target { return Some(x); } }
#     None
# }
```

中身の `x` に触れるのは `Some(x) =>` の側だけです。`None` の側には `x` がありません。C のように「確かめずに `*p`」とやろうとしても、`Option<&i32>` はそのままでは参照できず、コンパイルが通りません。中身を使うには `Some` を開けるしかなく、開ければ `None` の場合の分岐も書かされる、という形です。

`None` のときに何もしないなら、`if let` で `Some` の場合だけを書けます。

```rust
// Rust
# fn find(xs: &[i32], target: i32) -> Option<&i32> {
#     for x in xs { if *x == target { return Some(x); } }
#     None
# }
fn main() {
    let xs = [10, 20, 30];

    if let Some(x) = find(&xs, 20) {
        println!("見つかった: {x}"); // Some のときだけ実行される
    }
}
```

## 毎回 match を書かずに済ませる

`None` のときの扱いが決まっているなら、`match` を書くまでもない場面も多くあります。`Option` には、そういう定番の処理を短く書くメソッドがそろっています。

たとえば「あればその値、なければこの既定値」は `unwrap_or` です。

```rust
// Rust
# fn find(xs: &[i32], target: i32) -> Option<&i32> {
#     for x in xs { if *x == target { return Some(x); } }
#     None
# }
fn main() {
    let xs = [10, 20, 30];
    let x = find(&xs, 99).unwrap_or(&0); // 見つからなければ &0 を使う
    println!("{x}");                     // 0
}
```

「あれば中身を変換し、なければ `None` のまま」は `map` です。`Some` のときだけ関数を通し、`None` はそのまま素通りします。

```rust
// Rust
# fn find(xs: &[i32], target: i32) -> Option<&i32> {
#     for x in xs { if *x == target { return Some(x); } }
#     None
# }
fn main() {
    let xs = [10, 20, 30];
    let doubled = find(&xs, 20).map(|x| x * 2); // Some(20) → Some(40)、None → None
    println!("{doubled:?}");                    // Some(40)
}
```

どうしても中身が要る、しかもここで `None` はありえない、という場面のために `unwrap` もあります。`Some` なら中身を返し、`None` なら panic してプログラムを止めます。

```rust
// Rust
fn main() {
    let x: Option<i32> = Some(5);
    println!("{}", x.unwrap()); // 5

    let y: Option<i32> = None;
    println!("{}", y.unwrap()); // panic：None を unwrap した
}
```

`unwrap` は、`None` の場合の分岐を書かずに中身を取り出す近道です。そのぶん、`None` だったときは panic で止まります。3章の範囲外アクセスと同じで、未定義動作ではなく「`None` を開けようとした」とはっきり分かる止まり方ですが、確認を飛ばしている点は変わりません。`None` が本当にありえないと確信できるところ以外では、`match` や `unwrap_or` で `None` の側もきちんと書くのが基本です。

---

C の `NULL` は、有効なポインタと同じ型に紛れ込み、確認を忘れてもコンパイルが通りました。Rust の `Option<T>` は、「無いかもしれない」を別の型として立て、中身を使う前に必ず `None` の場合を考えさせます。C で気を張って確かめていたヌルチェックが、型とコンパイラの側に移った、と考えると近いです。次の章では、同じように C で気を張っていた文字列の扱い、`char*` と NUL 終端から、`&str` と `String` へ移ります。
