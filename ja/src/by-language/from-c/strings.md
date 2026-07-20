# 文字列

C言語 で文字列を扱うとき、使う型はほぼ `char*` 一択でした。末尾に NUL 文字（`\0`）を置いて終わりを示す、NUL 終端文字列です。Rust では `&str` と `String` という二つの型で文字列を表します。この章では、C と Rust の文字列の扱いを並べて、何が変わるかを見ます。

## C の文字列 — NUL 終端と `char*`

C の文字列は、`char` の配列の末尾に NUL 文字を付けた表現です。`"hello"` と書いたら、メモリには `'h' 'e' 'l' 'l' 'o' '\0'` という 6 バイトが並びます。

```c
// C
#include <stdio.h>
#include <string.h>

int main(void) {
    char s[] = "hello";
    printf("%zu\n", sizeof(s));  // 6 — NUL を含む配列のサイズ
    printf("%zu\n", strlen(s));  // 5 — NUL の手前までを数えた文字数
}
```

`sizeof` は配列全体のバイト数で、`strlen` は NUL の手前まで走って数えた値です。長さは文字列の中に保存されているのではなく、`strlen` がその都度数えにいきます。

この文字列を関数に渡すとき、型は `char*` になります。3章の配列と同じで、長さが消えます。

```c
// C
#include <stdio.h>

void greet(const char *name) {
    printf("hello, %s\n", name); // NUL まで読む
}

int main(void) {
    char s[] = "world";
    greet(s);
}
```

受け取った `name` の中に長さはなく、NUL がどこにあるかを頼りに終わりを判断します。バッファに書き込むときは、NUL も含めたサイズを守らなければなりません。守らないとどうなるか。

```c
// C
#include <string.h>

int main(void) {
    char buf[5];
    strcpy(buf, "hello"); // "hello\0" は 6バイト。buf は 5バイト → NUL が範囲外に書かれる
}
```

`strcpy` は NUL を含む `"hello\0"` を丸ごとコピーしようとします。`buf` は 5 バイトしかないので、NUL が `buf` の外に書き込まれます。コンパイルは通り、運が悪ければ他の変数を壊します。

## Rust の `&str` — ポインタと長さのセット

C の `const char*` に最も近い型が `&str` です。中身は 3章のスライス `&[i32]` と同じ構造で、先頭アドレスと長さを持っています。NUL 終端は使いません。長さが型の中に入っているので、NUL を置かなくても末尾がわかります。

```rust
// Rust
fn greet(name: &str) {
    println!("hello, {name}");
}

fn main() {
    greet("world");
}
```

C の `const char*` を受け取っていた関数が、Rust では `&str` を受け取ります。関数の中で長さを別に受け取る必要はありません。

## UTF-8 とバイト境界

C の `char*` に UTF-8 バイト列を入れて日本語を出力することはできます。ただし `strlen` や `s[i]` はバイト単位で動くだけで、文字の境界を知りません。

UTF-8 では、ASCII 文字（英数字など）は 1 バイトですが、ひらがな・漢字などは 3 バイトを使います。`"こんにちは"` は 5 文字ですが、メモリ上では 15 バイト並んでいます。

```c
// C
#include <stdio.h>
#include <string.h>

int main(void) {
    const char *s = "こんにちは";
    printf("%zu\n", strlen(s)); // 15 — バイト数（5文字 × 3バイト）
    printf("%d\n", s[0]);       // -29 — 'こ' の 1バイト目（文字ではない）
}
```

`s[0]` は `'こ'` ではなく、その 1 バイト目の値です。文字の境界はプログラマが把握して自分で扱う必要があります。

Rust の `&str` は常に有効な UTF-8 であることが型で保証されています。`.len()` が返すのはバイト数です。

```rust
// Rust
fn main() {
    let s = "こんにちは";
    println!("{}", s.len());            // 15 — バイト数
    println!("{}", s.chars().count());  // 5  — 文字数
}
```

C では `s[0]` で先頭バイトを取れましたが、Rust では `&str` を整数でインデックスするとコンパイルエラーになります。

```rust
// Rust
fn main() {
    let s = "こんにちは";
    println!("{}", s[0]); // エラー: `str` は整数でインデックスできない
}
```

`'こ'` は 3 バイトにまたがっているので、`s[0]` は `'こ'` の途中のバイトです。途中のバイトを文字として返せないため、インデックスを型レベルで禁止しています。文字単位で読みたいときは `.chars()` でイテレートします。特定の位置の文字を取り出したいときは `.chars().nth(n)` を使います。`Option<char>` が返るので、存在しない位置を指定しても範囲外アクセスにはなりません。

```rust
// Rust
fn main() {
    let s = "こんにちは";

    for c in s.chars() {
        print!("{c} "); // こ ん に ち は
    }
    println!();

    println!("{:?}", s.chars().nth(0)); // Some('こ')
    println!("{:?}", s.chars().nth(2)); // Some('に')
}
```

## 書き換えられる文字列 — `String`

`&str` は既存のバイト列を借りているだけなので、中身を変えることはできません。文字を追加したり、実行時に内容を組み立てたりしたいときは `String` を使います。

C では動的な文字列を扱うとき、`malloc` でバッファを確保して `strcpy` や `strcat` で内容を書き、最後に `free` で解放していました。

```c
// C
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int main(void) {
    char *s = malloc(32);
    strcpy(s, "こんにちは");
    strcat(s, "、Rust");
    printf("%s\n", s); // こんにちは、Rust
    free(s);
}
```

バッファサイズを超えて書き込めばオーバーランです。`free` を忘れればメモリリークです。

Rust の `String` はヒープにバッファを持ち、必要に応じて自動的に拡張します。スコープを抜けると自動的に解放されるので `free` は不要です。

```rust
// Rust
fn main() {
    let mut s = String::from("こんにちは");
    s.push_str("、Rust");
    println!("{s}"); // こんにちは、Rust
}
```

`&str` と `String` の関係は、2章の参照と同じです。`String` が値を所有し、`&str` はその一部を借りる参照です。`String` を `&str` として渡すことはできますが、逆はできません。

```rust
// Rust
fn greet(name: &str) {
    println!("hello, {name}");
}

fn main() {
    let s = String::from("world");
    greet(&s); // String を &str として渡せる
}
```

---

C の文字列は NUL 終端の `char*` 一本で、長さは別管理・エンコーディングは保証なし・解放は手動でした。Rust では、借用には `&str`（ポインタ＋長さ）、所有には `String` と役割が分かれており、どちらも UTF-8 が保証されています。C でプログラマが手で管理していたバッファサイズと `free` が、型とコンパイラの側に移った形です。次の章では、エラーコードや `errno` の代わりに `Result` と `?` で確認し忘れができない形にする、エラー処理を見ます。
