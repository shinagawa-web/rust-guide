# エラー処理

## 例外は制御フローが見えない

C++ では、関数がエラーを投げるかどうかは、関数のシグネチャを見てもわかりません。`std::stoi` の戻り値は `int` ですが、変換できない文字列を渡すと `std::invalid_argument` を投げます。

`try/catch` を書き忘れると、例外は捕まえられずにプログラムが強制終了します。

```cpp
// C++
#include <iostream>
#include <string>

int parse_port(const std::string& s) {
    return std::stoi(s);
}

int main() {
    int port = parse_port("not_a_number");  // 例外を捕まえ忘れたまま呼び出す
    std::cout << port << "\n";              // ここには到達しない
}
```

`try/catch` を書けばハンドルできますが、書き忘れてもコンパイルは通ります。

```cpp
// C++
#include <iostream>
#include <string>

int parse_port(const std::string& s) {
    return std::stoi(s);
}

int main() {
    try {
        int port = parse_port("8080");
        std::cout << port << "\n";
    } catch (const std::exception& e) {
        std::cerr << "error: " << e.what() << "\n";
    }
}
```

`noexcept` を付ければ「この関数は投げない」と明示できますが、付け忘れても型エラーにはなりません。

```cpp
// C++
#include <string>

// noexcept なし：投げるかもしれない
int parse_port(const std::string& s) {
    return std::stoi(s);
}

// noexcept あり：「投げない」と明示
int parse_port_safe(const std::string& s) noexcept {
    try {
        return std::stoi(s);
    } catch (...) {
        return -1;
    }
}
```

投げる関数と投げない関数が、シグネチャの見た目で区別できないまま混在します。例外がどこを通って飛ぶのかはコードを読んでも追えず、ハンドル漏れはコンパイル時にわかりません。

## エラーを型で返す

Rust では、失敗する可能性のある関数は `Result<T, E>` を返します。`Result<T, E>` は `Ok(T)` か `Err(E)` のどちらかです。戻り値の型を見るだけで「この関数は失敗しうる」とわかります。

```rust
// Rust
fn parse_port(s: &str) -> Result<u16, std::num::ParseIntError> {
    s.parse()
}

fn main() {
    match parse_port("8080") {
        Ok(port) => println!("{port}"),
        Err(e) => eprintln!("error: {e}"),
    }
}
```

`match` で `Ok` と `Err` の両方を処理しないとコンパイルエラーになります。`Err` のケースを省いてみます。

```rust
// Rust（コンパイルエラー）
fn parse_port(s: &str) -> Result<u16, std::num::ParseIntError> {
    s.parse()
}

fn main() {
    match parse_port("8080") {
        Ok(port) => println!("{port}"),
        // Err のケースがない
    }
}
```

```
error[E0004]: non-exhaustive patterns: `Err(_)` not covered
```

エラーを無視したコードは、そもそもコンパイルが通りません。

## ? でエラーを伝播する

複数の操作が失敗しうる場合、`match` を毎回書くと冗長になります。

```rust
// Rust
use std::num::ParseIntError;

fn add_ports(a: &str, b: &str) -> Result<u16, ParseIntError> {
    let p1 = match a.parse::<u16>() {
        Ok(v) => v,
        Err(e) => return Err(e),
    };
    let p2 = match b.parse::<u16>() {
        Ok(v) => v,
        Err(e) => return Err(e),
    };
    Ok(p1 + p2)
}

fn main() {
    println!("{:?}", add_ports("8080", "9090"));
    println!("{:?}", add_ports("8080", "not_a_number"));
}
```

`?` を使うと、同じ意味を短く書けます。`Err` のときは即座に呼び出し元へ返し、`Ok` のときは中身を取り出して続行します。

```rust
// Rust
use std::num::ParseIntError;

fn add_ports(a: &str, b: &str) -> Result<u16, ParseIntError> {
    let p1: u16 = a.parse()?;
    let p2: u16 = b.parse()?;
    Ok(p1 + p2)
}

fn main() {
    println!("{:?}", add_ports("8080", "9090"));
    println!("{:?}", add_ports("8080", "not_a_number"));
}
```

`?` を使う関数は戻り値が `Result` でなければコンパイルが通りません。この関数が失敗しうることが、シグネチャに必ず現れます。
