# コレクション

フィルタ処理を書くとします。数値のリストから条件を満たすものだけを取り出したい。取り出した件数は実行してみるまでわかりません。要素数をコンパイル時に決める配列では、こういった場面を扱えません。Rust には実行時に伸びるリスト `Vec` と、キーで値を取得する対応表 `HashMap` があります。このページではこの2つを見ていきます。

## Vec

要素数が決まっているなら配列で十分です。配列はサイズをコンパイル時に決め、所有元の場所にインラインで保持されるため余分な確保がありません。

```rust
fn main() {
    let scores = [90, 85, 92, 78]; // 4要素固定
    println!("{:?}", scores); // [90, 85, 92, 78]
}
```

実行してみるまで何件になるかわからない場合、配列は使えません。`Vec` はヒープ上に領域を確保し、`push` するたびに伸びます。

```rust
fn main() {
    let input = vec![1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    let mut evens: Vec<i32> = Vec::new();
    for n in input {
        if n % 2 == 0 {
            evens.push(n);
        }
    }
    println!("{:?}", evens); // [2, 4, 6, 8, 10]
}
```

最初から値が揃っているときは `vec![]` マクロで作れます。値から型を推論するので型注釈は不要です。

```rust
fn main() {
    let numbers = vec![10, 20, 30];
    println!("{:?}", numbers); // [10, 20, 30]
}
```

インデックスで要素を取り出せます。

```rust
fn main() {
    let numbers = vec![10, 20, 30];
    println!("{}", numbers[0]); // 10
}
```

範囲外のインデックスを渡すとパニックして停止します。インデックスが範囲内に収まる保証がないときは `get` を使います。`Option` で返るので `match` で受け取ります。

```rust
fn main() {
    let numbers = vec![10, 20, 30];
    match numbers.get(5) {
        Some(n) => println!("{}", n),
        None    => println!("範囲外です"), // こちらが動く
    }
}
```

`for` で順に処理します。`&numbers` と参照で渡すことで、ループのあとも `numbers` を使い続けられます。

```rust
fn main() {
    let numbers = vec![10, 20, 30];
    for n in &numbers {
        println!("{}", n);
    }
    println!("要素数: {}", numbers.len()); // 要素数: 3
}
```

## HashMap

`Vec` はインデックスでアクセスします。「Alice のスコアは何点か」を知りたいとき、Alice が何番目かを追跡するのは不自然です。名前から値を直接取得できる対応表が必要です。

`HashMap` はキーをハッシュ関数で格納位置に変換し、全走査なしにキーから値を取得できます。

`HashMap::new()` で作り、`insert` でキーと値の対を追加します。`HashMap` は `std::collections` に入っているので `use` で持ち込みます。

```rust
use std::collections::HashMap;

fn main() {
    let mut scores = HashMap::new();
    scores.insert("Alice", 85);
    scores.insert("Bob", 92);
    scores.insert("Carol", 78);
    println!("{:?}", scores);
}
```

`insert` の引数から型を推論するので型注釈は不要です。ただし1つの `HashMap` のキーと値はそれぞれ同じ型でなければなりません。

```rust
use std::collections::HashMap;

fn main() {
    let mut scores = HashMap::new();
    scores.insert("Alice", 85);
    scores.insert("Bob", 92.0); // コンパイルエラー: expected integer, found floating-point number
}
```

`get` にキーを渡すと `Option<&V>` で返ります。キーが存在しないこともあるので `match` で受け取ります。

```rust
use std::collections::HashMap;

fn main() {
    let mut scores = HashMap::new();
    scores.insert("Alice", 85);
    scores.insert("Bob", 92);

    match scores.get("Alice") {
        Some(n) => println!("Alice: {}", n), // Alice: 85
        None    => println!("見つかりません"),
    }
}
```

`get` は値そのものではなく参照で返します。この例では `*` で明示的に値を取り出してから計算しています。

```rust
use std::collections::HashMap;

fn main() {
    let mut scores = HashMap::new();
    scores.insert("Alice", 85);

    if let Some(score) = scores.get("Alice") {
        let bonus = *score + 10;
        println!("{}", bonus); // 95
    }
}
```

キーがなければ初期値を入れ、あればそのまま使う操作には `entry().or_insert()` が便利です。単語の出現回数を数える例です。

```rust
use std::collections::HashMap;

fn main() {
    let words = vec!["the", "fox", "jumps", "the", "fox", "the"];
    let mut counts = HashMap::new();

    for word in words {
        *counts.entry(word).or_insert(0) += 1;
    }

    println!("{:?}", counts); // 出力例: {"fox": 2, "the": 3, "jumps": 1}（順序は実行ごとに異なる）
}
```

`or_insert` は値への可変参照 `&mut V` を返します。`*` でデリファレンスしてから `+= 1` します。

`for` でキーと値のペアを取り出せます。取り出す順序は挿入順が保証されません。

```rust
use std::collections::HashMap;

fn main() {
    let mut scores = HashMap::new();
    scores.insert("Alice", 85);
    scores.insert("Bob", 92);
    scores.insert("Carol", 78);

    for (name, score) in &scores {
        println!("{}: {}", name, score);
    }
}
```

## まとめ

- `Vec` は実行時に伸びるリスト。要素数が決まっていれば配列、実行前に決まらない・増減するなら `Vec`。
- `Vec::new()` で空のリストを作り `push` で追加。インデックスで直接取り出せるが、範囲外はパニックするため不安なときは `get` を使う。
- `HashMap` はキーで値を取得する対応表。インデックスではなく名前や ID でアクセスしたいときに使う。
- `entry().or_insert()` でキーがなければ初期値を入れ、あればそのまま使える。取り出し順は挿入順が保証されない。
