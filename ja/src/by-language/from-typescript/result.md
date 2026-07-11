# エラーの扱い

TypeScript で失敗を伝える基本は例外です。関数の中で `throw` し、呼ぶ側が `try-catch` で受け止める。うまくいけば値が返り、だめなら例外が投げられて `catch` に飛びます。

この方式には、便利さと引き換えの弱点があります。ある関数が例外を投げうるのか、投げるとしたら何を投げるのかは、型に現れません。`catch` を書くかどうかは呼ぶ側しだいで、書き忘れてもコンパイルは通ります。「失敗したかもしれない」という事実が、戻り値の型からは見えないのです。

Rust はここが違います。成否を `throw` で投げるのではなく、`Result` という型に載せて戻り値として返します。そして中身を使う前に成否を確かめることを、コンパイラが要求します。「無いかもしれない」を `Option` で表したのと、そっくり同じ発想です。

この章は、注文フォームから来た「個数」の文字列を数値にして使う、という場面で進めます。利用者が打つ文字列は数字とは限りません。数字でなかったときにどう振る舞うかが、TypeScript と Rust で分かれます。

## TypeScript では失敗が型に出ない

入力の文字列を数値に変換します。TypeScript で `Number()` を使うと、数字でない文字列は例外にはならず、`NaN` という特別な値になります。

```ts
// TypeScript
const qty = Number("abc"); // NaN（例外は投げられない）
console.log(qty * 500);    // NaN（そのまま計算に流れてしまう）
```

`NaN` は数値型なので、`qty` の型は `number` のままです。そのまま掛け算に使えてしまい、結果も `NaN` になって後ろへ流れます。`NaN` が「数字でなかった」しるしなのか、計算の途中でそうなったのかは、この値だけでは区別できません。

例外を投げる書き方にしても、事情は似ています。数字でなければ `throw` する関数を書いても、戻り値の型は `number` のままで、投げうることは型に出ません。

```ts
// TypeScript
function toQty(input: string): number {
  const n = Number(input);
  if (Number.isNaN(n)) throw new Error("数字ではありません");
  return n; // 戻り値の型は number。throw しうることは型に現れない
}

const qty = toQty("abc"); // try-catch で囲まなくてもコンパイルは通る
```

`toQty` を呼ぶ側は、`try-catch` で囲うかどうかを自分で判断します。囲い忘れても止められず、実行時にその経路を通ったとき初めて例外が飛び、誰も捕まえなければそのままプロセスが落ちます（Node.js の場合）。「失敗したかもしれない」ことも、それを確かめたかどうかも、`qty` の型には現れません。

## Rust では成否が型に出る（Result）

同じ変換を Rust で書きます。文字列を数値にするのが `parse` で、うしろの `::<i32>` は「`i32` に変換して」と `parse` に伝える指定です。その戻り値は、数値そのものではなく `Result` です。

```rust
// Rust
fn main() {
    let qty = "abc".parse::<i32>(); // qty の型は Result<i32, ParseIntError>
    println!("{qty:?}");            // Err(ParseIntError { .. })
}
```

戻り値の型に付いた `Result<i32, ParseIntError>` を、まず読み解きます。`Map<string, number>` が二つの型を持っていたのと同じように、`Result` も山かっこの中に二つの型を書きます。前半の `i32` は成功したときに得られる値の型、後半の `ParseIntError` は失敗したときに入る理由の型です。つまりこの型は「成功すれば `i32`、失敗すれば `ParseIntError` を持つ」と言っています。

その中身は、成功か失敗かで姿が変わります。`Option` が `Some` と `None` の二択だったのと同じように、`Result` も次の二つのどちらかになります。

- `Ok(3)`：成功。中に、変換できた数値（`i32`）が入る
- `Err(...)`：失敗。中に、変換できなかった理由（`ParseIntError`）が入る

`Option` の `Some` / `None` と違うのは、成功側の `Ok` だけでなく、失敗側の `Err` も中身を持てることです。「無い」を表すだけだった `None` に対し、`Err` は「なぜ失敗したか」まで運べます。

数字でない文字列を渡すと、`NaN` のように数値へ紛れ込まず、この `Err` になります。さきほどの `"abc"` がまさにそれで、返ってきたのは `Err` でした。そして `qty` は数値そのものではなく `Result` なので、いきなり数として使うことはできません。

```rust
// Rust
fn main() {
    let qty = "abc".parse::<i32>();
    println!("{}", qty + 1); // コンパイルエラー：Result は i32 のように足せない
}
```

TypeScript では `NaN` が `number` のまま計算に流れ込み、実行するまで気づけませんでした。Rust は、`Ok` か `Err` かを先に確かめない限り、中の数値に触らせません。この確認は任意ではなく、省くとコンパイルエラーになります。`undefined` を潰してから使うのと同じ習慣が、失敗にも及ぶわけです。

## 中身を取り出す

`Result` から中身を取り出す基本は、`Option` のときと同じ `match` です。`Ok` と `Err` を分けて処理する形で、TypeScript で言えば `try { } catch { }` の受け止める側にあたります。`Ok` なら成功した値で先へ進み、`Err` ならその失敗に応じて対処します。次の例では、数字ならその個数で処理を進め、数字でなければ利用者に入力し直してもらいます。

```rust
// Rust
fn main() {
    let input = "3";
    match input.parse::<i32>() {
        Ok(qty) => println!("{qty} 個を処理します"),
        Err(_) => println!("個数は数字で入力してください"),
    }
}
```

`Err` の側を書かないとコンパイルが通らないので、「数字でなかった場合」の考慮漏れが起きません。TypeScript の `catch` は書き忘れても通りましたが、こちらは書き漏らせない形です。

入力ではなく、自分でコードに書いたリテラルを数値にするときは、失敗しないと分かっています。そういう場面では `unwrap()` で、確認を省いて中身をそのまま取り出せます。

```rust
// Rust
fn main() {
    let max = "100".parse::<i32>().unwrap(); // 自分で書いた "100" なので確実
    println!("上限は {max} 個");
}
```

`unwrap` は「ここは絶対に成功するはず」と言い切れる場面に限る最終手段です。`Err` が来ると `unwrap` はその場で panic してプログラムを止めます。だから、利用者が入力した文字列を数値に変換するときのように、その変換が成功するとは限らない場面では使いません。`unwrap` という名前がコードに残るので、どこで確認を飛ばしたかは読めば分かります。
## 失敗を呼び出し元へ渡す（`?`）

個数と単価を受け取り、両方を数値に変換して掛け合わせ、注文の小計を返す関数を書きます。変換はどちらも失敗しうるので、片方でも数字でなければ、その時点で中断して失敗を返したい。

TypeScript の例外なら、こう書けます。変換する `toNumber` が数字でなければ `throw` し、`subtotal` はそれを二回呼ぶだけです。

```ts
// TypeScript
function toNumber(input: string): number {
  const n = Number(input);
  if (Number.isNaN(n)) throw new Error("数字ではありません");
  return n;
}

function subtotal(qty: string, price: string): number {
  const q = toNumber(qty);   // 数字でなければ、ここで throw
  const p = toNumber(price);
  return q * p;
}

try {
  console.log(`小計 ${subtotal("3", "500")} 円`); // 小計 1500 円
} catch {
  console.log("個数と単価は数字で入力してください");
}
```

`subtotal` の中には `if` も `try` もありません。それでも片方の変換が投げれば、残りは飛ばして、呼び出し元の `catch` まで一気に上がっていきます。途中に中断を書かなくても伝わるのが、例外の便利なところでした。

Rust には `throw` はありませんが、これに近い短縮が `?` です。`Ok` なら中身を取り出して先へ進み、`Err` ならその場で `Err` を返して関数を抜けます。

```rust
// Rust
use std::num::ParseIntError;

fn subtotal(qty: &str, price: &str) -> Result<i32, ParseIntError> {
    let q = qty.parse::<i32>()?;   // 数字でなければ、ここで Err を返す
    let p = price.parse::<i32>()?;
    Ok(q * p)
}

fn main() {
    match subtotal("3", "500") {
        Ok(total) => println!("小計 {total} 円"),      // 小計 1500 円
        Err(_) => println!("個数と単価は数字で入力してください"),
    }
}
```

例外との違いは、伝わり方が型に現れることです。この `subtotal` のように、`?` は `Result` を返す関数の中で使えます。`Err` をその場で返す先が要るからで、それはつまり「この関数は失敗しうる」と型に書くことでもあります。TypeScript の例外がどこからでも黙って上がっていけたのに対し、Rust の `?` は失敗を運ぶ関数を戻り値の型で明かします。呼び出し元の `main` は、返ってきた `Result` を `match` で受け止め、成功なら小計を、失敗なら入力し直しを促します。

この `?` は `Option` に対しても同じ形で使え、`Option` なら `None` を、`Result` なら `Err` を、それぞれ呼び出し元へ渡します。「無いかもしれない」と「失敗したかもしれない」を、同じ書き味で扱えるようにしてあるわけです。

ここまでで、TypeScript の `throw` / `try-catch` が Rust では `Result` と `?` になり、成否を確かめないまま中の値へ進めない形に徹底されることを見ました。次は、共通の振る舞いを表す trait を見ます。
