# nullptr と Option

## nullptr チェックを忘れても型は気づかない

C++ のポインタ型は、有効なアドレスを指す場合と `nullptr` の場合を同じ型で表します。関数が `nullptr` を返してきても、呼び出し側がチェックしなくてもコンパイルは通ります。

```cpp
// C++
#include <iostream>
#include <vector>

const int* find_value(const std::vector<int>& data, int target) {
    for (const int& v : data) {
        if (v == target) return &v;
    }
    return nullptr;
}

int main() {
    std::vector<int> data = {10, 20, 30};
    const int* result = find_value(data, 99);
    std::cout << *result << "\n";  // nullptr を参照 → 未定義動作（クラッシュ）
}
```

チェックを書き忘れた箇所は、コンパイラには見えません。実行してみてはじめてクラッシュします。

`std::optional` を使うと「あるかもしれない」を型で表せるようになります。

```cpp
// C++17
#include <iostream>
#include <optional>
#include <vector>

std::optional<int> find_value(const std::vector<int>& data, int target) {
    for (int v : data) {
        if (v == target) return v;
    }
    return std::nullopt;
}

int main() {
    std::vector<int> data = {10, 20, 30};
    std::optional<int> result = find_value(data, 99);
    std::cout << result.value() << "\n";  // 空のとき std::bad_optional_access が投げられる
}
```

返り値が「あるかもしれない」型になったので、中身を取り出すコードは書かなければなりません。しかし `.value()` 自体はチェックなしで呼べます。空のときは実行時に例外が投げられ、プログラムは止まります。「チェックし忘れ」がコンパイルを通り抜ける、という問題は変わっていません。

## 値があるかないかを Option で表す

Rust では、あるかもしれない値を `Option<T>` で表します。`Option<T>` は `Some(T)` か `None` のどちらかを持つ型で、他のどんな状態にもなれません。

先ほどの `find_value` を Rust で書くと次のようになります。

```rust
// Rust
fn find_value(data: &[i32], target: i32) -> Option<i32> {
    for &v in data {
        if v == target {
            return Some(v);
        }
    }
    None
}

fn main() {
    let data = vec![10, 20, 30];
    let result = find_value(&data, 20);
    match result {
        Some(v) => println!("found: {v}"),
        None => println!("not found"),
    }
}
```

`match` で `Some` と `None` の両方を処理しないとコンパイルエラーになります。`None` のケースを省くと次のエラーが出ます。

```rust
// Rust（コンパイルエラー）
fn find_value(data: &[i32], target: i32) -> Option<i32> {
    for &v in data {
        if v == target {
            return Some(v);
        }
    }
    None
}

fn main() {
    let data = vec![10, 20, 30];
    let result = find_value(&data, 20);
    match result {
        Some(v) => println!("found: {v}"),
        // None のケースがない
    }
}
```

```text
error[E0004]: non-exhaustive patterns: `None` not covered
```

「取りうるすべてのパターンを処理せよ」という要求が、コンパイル時に出ます。チェックし忘れたコードは、そもそも動くプログラムになりません。

`None` のときは何もしない、という場面では `match` に `None => {}` と書くのは冗長です。`if let` を使うと `Some` のケースだけ書けます。

```rust
// Rust
fn find_value(data: &[i32], target: i32) -> Option<i32> {
    for &v in data {
        if v == target {
            return Some(v);
        }
    }
    None
}

fn main() {
    let data = vec![10, 20, 30];
    if let Some(v) = find_value(&data, 20) {
        println!("found: {v}");
    }
}
```

`Some` のときだけブロックに入り、`None` のときは何もしません。`match` でわざわざ `None => {}` と書く必要がなくなります。

見つからなければデフォルト値を使いたい場合は、`unwrap_or` で一行にまとめられます。

```rust
// Rust
fn find_value(data: &[i32], target: i32) -> Option<i32> {
    for &v in data {
        if v == target {
            return Some(v);
        }
    }
    None
}

fn main() {
    let data = vec![10, 20, 30];
    let v = find_value(&data, 99).unwrap_or(-1);
    println!("{v}");  // -1
}
```

`Some(v)` なら中の値を、`None` なら引数に渡した値を返します。
