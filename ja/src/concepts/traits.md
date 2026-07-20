# トレイト

「ログを書き込む」処理があります。開発中はコンソールに出したい。本番ではファイルに残したい。どこに出すかは違っても、呼び出し側がしたいのは「ログを書き込む」こと一つです。ところが出力先ごとに別々の関数を書いていくと、名前も呼び出しもばらばらで、同じ「ログを書き込む」がコードの上でつながりません。

トレイトは、こういう「型は違うけれど共通してできること」に名前を付ける仕組みです。名前を付けておくと、関数の側は「その名前を持つ型なら何でも」受け取れるようになります。このページでは、トレイトの定義と実装から始めて、その名前を要求する関数、標準ライブラリのトレイトの使い方、違う型をまとめて扱う書き方まで見ていきます。

## 同じふるまいを型ごとに書く

コンソールとファイル、それぞれへ書き込む関数です。

```rust
struct ConsoleLogger;
struct FileLogger { path: String }

fn console_log(_logger: &ConsoleLogger, message: &str) {
    println!("{message}");
}

fn file_log(logger: &FileLogger, message: &str) {
    println!("({} に書き込み) {message}", logger.path);
}
```

どちらも「ログを書き込む」処理ですが、関数名が別々です。「どんな出力先にも同じ内容を書き込む」関数を一つ書こうとすると、型の位置に何を書けばいいか決められません。

```rust
fn process(logger: ???, message: &str) {
    // コンソールなら console_log、ファイルなら file_log？
}
```

`ConsoleLogger` を書けばファイルに渡せなくなる。出力先ごとに `process_console`・`process_file` と増やしていくと、出力先が増えるたびに同じ処理を何度も書くことになります。

## 共通のふるまいに名前を付ける

そこで、「ログを書き込める」という共通のふるまいに名前を付けます。これがトレイトです。

```rust
trait Logger {
    fn log(&self, message: &str);
}
```

`trait Logger` は、「`log` という関数を持つ」という約束に名前を付けただけのものです。中身はまだ書きません。次に、その約束を各型に果たさせます。

```rust
impl Logger for ConsoleLogger {
    fn log(&self, message: &str) {
        println!("{message}");
    }
}

impl Logger for FileLogger {
    fn log(&self, message: &str) {
        println!("({} に書き込み) {message}", self.path);
    }
}
```

`impl Logger for ConsoleLogger` は、「ConsoleLogger は Logger の約束を果たす」という宣言です。これで ConsoleLogger も FileLogger も「Logger を持つ型」になりました。呼び方も `.log()` に揃います。型ごとにばらばらだった関数名が、`log` 一つにまとまったわけです。

## そのトレイトを持つ型なら受け取れる

名前を付けたことで、関数の側が変わります。「Logger を持つ型なら何でも」受け取る関数を、一つだけ書けます。

```rust
struct ConsoleLogger;
struct FileLogger { path: String }

trait Logger {
    fn log(&self, message: &str);
}

impl Logger for ConsoleLogger {
    fn log(&self, message: &str) {
        println!("{message}");
    }
}

impl Logger for FileLogger {
    fn log(&self, message: &str) {
        println!("({} に書き込み) {message}", self.path);
    }
}

fn process(logger: &impl Logger) {
    logger.log("処理を開始します");
    logger.log("処理が完了しました");
}

fn main() {
    let console = ConsoleLogger;
    let file = FileLogger { path: "app.log".to_string() };

    process(&console);   // コンソールでも
    process(&file);      // ファイルでも
}
```

`&impl Logger` は、「Logger を持つ型への参照なら何でも」という意味です。`process` は、相手がコンソールかファイルかを知りません。知っているのは「Logger を持っている＝ `log()` を呼べる」ことだけ。だから一つの関数で両方を扱えます。型ごとに関数を分けずに済むのは、この「中身の型ではなく、できることだけを要求する」書き方のおかげです。

この「トレイトを持つ型なら何でも」を、もう一歩踏み込んで書く方法が [ジェネリクス](generics.md) です。ここでは入口まで見ておけば十分です。

## 共通部分はトレイトに一度だけ書く

トレイトには、関数の約束だけでなく、既定の中身も持たせられます。デフォルト実装です。

```rust
trait Logger {
    fn log(&self, message: &str);

    fn warn(&self, message: &str) {
        self.log(&format!("[WARN] {message}"));
    }
}
```

`warn` には中身が書いてあります。「`[WARN]` を前に付けて `log` を呼ぶ」という処理は、どの出力先でも同じだからです。だから各型の `impl` で書かなくても、`Logger` を持つ型なら最初から `warn` を使えます。

```rust
struct ConsoleLogger;

trait Logger {
    fn log(&self, message: &str);

    fn warn(&self, message: &str) {
        self.log(&format!("[WARN] {message}"));
    }
}

impl Logger for ConsoleLogger {
    fn log(&self, message: &str) {
        println!("{message}");
    }
}

fn main() {
    let console = ConsoleLogger;
    console.warn("ディスクが残り少なくなっています");
    // → [WARN] ディスクが残り少なくなっています
}
```

型ごとに違う部分（`log`）だけを各 `impl` で書き、どの型でも同じでいい部分（`warn`）はトレイトに一度書けばいい。ある型だけ振る舞いを変えたければ、その型の `impl` で `warn` を書き直せば上書きできます。

## すでにあるトレイトを使う

トレイトは自分で定義するだけでなく、標準ライブラリに用意されたものを使う場面も多くあります。たとえば、構造体を `{:?}` で表示するには、`Debug` というトレイトが要ります。

```rust
struct Point { x: i32, y: i32 }

fn main() {
    let p = Point { x: 1, y: 2 };
    println!("{p:?}");   // コンパイルエラー：Point は Debug を持っていない
}
```

`Point` は `Debug` を持っていないので、これは止まります。とはいえ、`Debug` の中身は「構造体名とフィールド名・値を並べて表示する」という機械的なもので、自分で書くのは退屈です。そこで、コンパイラに自動で実装させます。

```rust
#[derive(Debug)]
struct Point { x: i32, y: i32 }

fn main() {
    let p = Point { x: 1, y: 2 };
    println!("{p:?}");   // Point { x: 1, y: 2 }
}
```

`#[derive(Debug)]` と付けるだけで、コンパイラが `Debug` の実装を導き出します（derive は「導出する」の意）。標準ライブラリには、`Debug` のほかにも、等値比較の `PartialEq`、複製の `Clone` など、`derive` で済むトレイトがそろっています。

なお、`{:?}` の `Debug` は開発者が中身を確認するための表示です。利用者に見せる整った表示は `Display`（`{}` で使う）という別のトレイトが担います。`Display` は `derive` できないので、中身を自分で書きます。

```rust
use std::fmt;

struct Point { x: i32, y: i32 }

impl fmt::Display for Point {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "({}, {})", self.x, self.y)
    }
}

fn main() {
    let p = Point { x: 1, y: 2 };
    println!("{p}");   // (1, 2)
}
```

## 違う型を一つにまとめる

開発中はコンソールに出しつつ、同じ内容をファイルにも残したい、という場面があります。`logger.log("起動しました")` を一度書くだけで、両方に届くようにしたい。

```rust
struct ConsoleLogger;
struct FileLogger { path: String }

trait Logger {
    fn log(&self, message: &str);
}

impl Logger for ConsoleLogger {
    fn log(&self, message: &str) {
        println!("{message}");
    }
}

impl Logger for FileLogger {
    fn log(&self, message: &str) {
        println!("({} に書き込み) {message}", self.path);
    }
}

fn main() {
    let loggers: Vec<Box<dyn Logger>> = vec![
        Box::new(ConsoleLogger),
        Box::new(FileLogger { path: "app.log".to_string() }),
    ];

    for logger in &loggers {
        logger.log("起動しました");
    }
}
```

`ConsoleLogger` と `FileLogger` は別の型なので、そのままでは同じ `Vec` に混ぜられません。`dyn Logger` を使うと、「Logger を持つ型なら型が違っても同じ `Vec` に入れてよい」という扱いができます。あとはループで回すだけで、全出力先に同じメッセージが届きます。出力先を増やしたければ `vec!` に足すだけで、呼び出し側は変わりません。`Box` で包むのは、型が違えば中身の大きさも違うので、そのままでは `Vec` の一つの箱に揃えて並べられないからです。`Box` に入れると大きさの決まったポインタになり、`Vec` はそれを並べられます。その仕組みの詳細は [スマートポインタ](smart-pointers.md) で扱います。

## まとめ

- トレイトは「共通してできること」に名前を付ける仕組み。`trait` で約束を定義し、`impl Trait for 型` でその約束を型に果たさせる。
- 関数は `&impl Trait` で「そのトレイトを持つ型なら何でも」受け取れる。中身の型ではなく、できることだけを要求するので、型ごとに関数を分けずに済む。
- デフォルト実装を使うと、どの型でも同じでいい部分をトレイトに一度だけ書ける。標準トレイト（`Debug` など）は `#[derive(...)]` でコンパイラに自動実装させられる。
- 違う型を一つにまとめて扱いたいときは `dyn Trait`。
- 「このトレイトを持つ型なら何でも」を、さらに踏み込んで書くのが [ジェネリクス](generics.md) です。
