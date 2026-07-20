# エラー処理

C言語 では、関数がエラーを返すとき、戻り値に `-1` や `NULL` を使い、詳細は `errno` に置く慣習がありました。Rust では `Result` という型でエラーを表します。この章では、C と Rust のエラー処理の書き方を並べて、何が変わるかを見ます。

## C のエラー処理 — 戻り値と errno

C の標準ライブラリ関数は、エラーが起きたとき戻り値でそれを示します。`fopen` は `FILE *` を返し、失敗すれば `NULL` を返します。エラーの詳細は `errno` というグローバル変数に書き込まれます。

```c
// C
#include <stdio.h>
#include <errno.h>
#include <string.h>

int main(void) {
    FILE *f = fopen("data.txt", "r");
    if (f == NULL) {
        printf("エラー: %s\n", strerror(errno));
        return 1;
    }
    // ファイルを使う処理...
    fclose(f);
    return 0;
}
```

問題は、この確認を忘れてもコンパイルが通ることです。`fopen` の戻り値を確認せずにそのまま使うと、`NULL` を参照してクラッシュします。

```c
// C
FILE *f = fopen("data.txt", "r");
fclose(f); // f が NULL ならクラッシュ
```

ファイルを開いて読んで閉じる、という処理が何段階にもなると、毎回の確認でコードが縦に伸びます。

```c
// C
#include <stdio.h>

int main(void) {
    FILE *f = fopen("data.txt", "r");
    if (f == NULL) return 1;

    char buf[256];
    if (fgets(buf, sizeof(buf), f) == NULL) {
        fclose(f);
        return 1;
    }

    FILE *out = fopen("out.txt", "w");
    if (out == NULL) {
        fclose(f);
        return 1;
    }

    if (fputs(buf, out) == EOF) {
        fclose(f);
        fclose(out);
        return 1;
    }

    fclose(f);
    fclose(out);
    return 0;
}
```

エラーパスが増えるたびに `fclose` を書く箇所も増えます。どこかで忘れればファイルが閉じられないまま残ります。

## Rust の `Result` — エラーを型で表す

Rust では、失敗するかもしれない関数は `Result<T, E>` を返します。`Option` の `Some`/`None` と同じ構造で、成功なら `Ok(T)`、失敗なら `Err(E)` です。

```rust
// Rust
use std::fs::File;

fn main() {
    let result = File::open("data.txt");

    match result {
        Ok(f)  => println!("開けた: {f:?}"),
        Err(e) => println!("エラー: {e}"),
    }
}
```

`File::open` の戻り値は `Result<File, std::io::Error>` です。`NULL` や `-1` ではなく、成功と失敗が別の型として分かれています。`Ok` の中身（ファイルハンドル）を使うには `match` で開けなければならず、`Err` の場合も書かされます。C で確認を忘れられたところが、ここでは飛ばせません。

`Err` のときに何もせず早期リターンしたい場面が多くあります。C の `if (f == NULL) return 1;` に相当する書き方です。Rust では `?` を使います。

```rust
// Rust
use std::fs::File;
use std::io::{self, Read};

fn read_file() -> Result<String, io::Error> {
    let mut f = File::open("data.txt")?; // Err なら即 return
    let mut buf = String::new();
    f.read_to_string(&mut buf)?;         // Err なら即 return
    Ok(buf)
}

fn main() {
    match read_file() {
        Ok(s)  => println!("{s}"),
        Err(e) => println!("エラー: {e}"),
    }
}
```

`?` は `Err` のとき即座に呼び出し元に返し、`Ok` のときは中身を取り出して続行します。C の `if (result == NULL) { fclose(...); return 1; }` を毎回書いていたところが、`?` 一文字になります。

## ファイルは自動的に閉じられる — Drop

C の多段エラー処理でもう一つ面倒だったのは、`return 1` するたびにその時点で開いているファイルを全部 `fclose` してから戻ることでした。Rust では、変数がスコープを抜けると自動的に後始末が走ります。`File` はスコープを抜けると自動的に閉じられるので、`fclose` を書く必要がありません。

さきほどの `read_file` で `f.read_to_string` が `Err` を返したとき、`?` で即座にリターンします。そのとき `f` はスコープを抜けるので、自動的に閉じられます。明示的に `fclose` を書かなくても、どのパスを通っても閉じられることが保証されています。

```rust
// Rust
use std::fs::File;
use std::io::{self, Read, Write};

fn copy_file() -> Result<(), io::Error> {
    let mut f = File::open("data.txt")?;   // Err なら return。f は閉じられる
    let mut buf = String::new();
    f.read_to_string(&mut buf)?;           // Err なら return。f は閉じられる

    let mut out = File::create("out.txt")?; // Err なら return。f と out は閉じられる
    out.write_all(buf.as_bytes())?;

    Ok(())
    // ここでスコープを抜けると f と out が自動的に閉じられる
}
```

C で `fclose` の書き忘れを防ぐために手で書いていたところが、Rust ではスコープと所有権の仕組みに任せられます。

---

C のエラー処理は、戻り値の確認もリソースの後始末も、書くかどうかをプログラマが決めていました。Rust の `Result` はエラーを型に出し、確認しなければ中身を使えません。`?` で伝播を短く書け、`Drop` でスコープを抜ければ後始末が自動的に走ります。次の章では、タグを手で管理する `union` の代わりに、タグ付きのデータを持つ `enum` と `match` を見ます。
