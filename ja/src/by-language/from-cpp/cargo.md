# ビルドと依存管理

## ビルドと依存管理を Cargo 一つで

C++ では、ビルドの設定と依存ライブラリの調達に複数のツールを組み合わせます。ビルドの設定には CMake を使い、依存の取得には FetchContent（CMake 組み込み）や vcpkg・Conan といった外部ツールを使います。どの方法を選んでも `CMakeLists.txt` に `target_link_libraries` などの設定を書いて繋ぎ込む作業が必要です。

```bash
# 依存ライブラリをインストールしてから
vcpkg install nlohmann-json

# CMakeLists.txt に find_package と target_link_libraries を追記し、
# ビルドディレクトリを作ってビルドする
mkdir build && cd build
cmake ..
make
```

新しいライブラリを一つ追加するたびに、インストールと `CMakeLists.txt` の編集という二つの手順が必要で、プロジェクトに参加した人は同じ手順を手元でも再現しなければなりません。

Rust では、これらをすべて Cargo が担います。ビルド・テスト・依存管理・crates.io へのパッケージ公開まで、Cargo のコマンドだけで操作します。

```bash
cargo build    # ビルド
cargo test     # テスト実行
cargo publish  # crates.io へ公開
```

依存ライブラリを追加するには、`cargo add` を実行するか、`Cargo.toml` に一行書くだけです。

```bash
cargo add serde
```

```toml
[dependencies]
serde = "1"
```

次にビルドしたとき、Cargo は crates.io からライブラリを自動でダウンロードしてビルドに組み込みます。`Cargo.toml` と `Cargo.lock` をリポジトリに含めておけば、別の環境でも `cargo build` 一つで同じ依存関係が再現されます。

## 依存クレートを追加する

C++ で外部ライブラリを使うには、CMake の FetchContent でソースを取得しつつ、`CMakeLists.txt` にリンクの設定も書く必要があります。たとえば JSON を扱う nlohmann/json を追加するなら次のようになります。

```cmake
include(FetchContent)

FetchContent_Declare(
  json
  URL https://github.com/nlohmann/json/releases/download/v3.12.0/json.tar.xz
)
FetchContent_MakeAvailable(json)

target_link_libraries(my_app PRIVATE nlohmann_json::nlohmann_json)
```

取得と設定が分離しているため、ライブラリが一つ増えるたびに `FetchContent_Declare` / `FetchContent_MakeAvailable` / `target_link_libraries` の三か所を編集することになります。

Rust では `Cargo.toml` の `[dependencies]` に追記するだけです。シリアライズの枠組みである serde（serialize と deserialize から来た名前）と、その JSON 実装である serde_json を例にすると、次の二行を追加します。

```toml
[dependencies]
serde = { version = "1", features = ["derive"] }
serde_json = "1"
```

`features = ["derive"]` は、後述する `#[derive(Serialize)]` を有効にするためのオプションです。

これだけで次のビルド時に crates.io から自動的に取得されます。実際に使うコードはこうなります。

```rust
use serde::Serialize;

#[derive(Serialize)]
struct Point {
    x: i32,
    y: i32,
}

fn main() {
    let p = Point { x: 1, y: 2 };
    let json = serde_json::to_string(&p).unwrap();
    println!("{}", json); // {"x":1,"y":2}
}
```

`#[derive(Serialize)]` を書くだけで、`Point` を JSON 文字列に変換する実装が自動生成されます。

## ヘッダとソースの代わりにモジュール

C++ では、宣言と定義を別のファイルに置きます。`main.cpp` が `point.cpp` の関数を使うには、まず `#include "point.h"` で宣言だけを取り込み、リンク時に `point.cpp` のオブジェクトと結合します。宣言と定義を分けるのは、コンパイラがファイルを一つずつ独立してコンパイルするためです。`main.cpp` をコンパイルする時点では `make_point` の実装を見る必要がなく、宣言さえあれば型検査できます。

```cpp
// point.h — 宣言のみ
#pragma once

struct Point {
    int x;
    int y;
};

Point make_point(int x, int y);
```

```cpp
// point.cpp — 定義
#include "point.h"

Point make_point(int x, int y) {
    return Point{x, y};
}
```

```cpp
// main.cpp
#include <iostream>
#include "point.h"

int main() {
    Point p = make_point(3, 4);
    std::cout << "(" << p.x << ", " << p.y << ")" << std::endl;
    return 0;
}
```

```bash
g++ -std=c++11 main.cpp point.cpp -o point && ./point
# (3, 4)
```

Rust にはヘッダファイルがありません。コンパイラがクレート全体のソースを把握しているので、テキストをコピーして宣言を伝える仕組みが不要です。代わりに `mod` キーワードでモジュールを定義し、外部に見せたいものだけ `pub` を付けます。

`pub struct Point` と書いても、フィールドのアクセス権は別に制御されます。フィールドに `pub` を付けなければ、モジュールの外から直接触ることはできません。このセクションの例では `x` と `y` を非公開にしたまま、`new` だけを `pub` にしています。外から値を作る手段は `new` に絞られ、フィールドの直接操作はコンパイルエラーになります。

```rust
mod point {
    #[derive(Debug)]
    pub struct Point {
        x: i32,
        y: i32,
    }

    impl Point {
        pub fn new(x: i32, y: i32) -> Point {
            Point { x, y }
        }
    }
}

use point::Point;

fn main() {
    let p = Point::new(3, 4);
    println!("{:?}", p); // Point { x: 3, y: 4 }
}
```

`#[derive(Debug)]` を付けると `{:?}` で中身を出力できます。`use point::Point;` で型名を現在のスコープに取り込むと、毎回 `point::Point` と書かずに `Point` だけで参照できます。
