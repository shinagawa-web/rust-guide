# 複数ファイルとオプションに対応する

初級の rwc は、ファイルを一つ受け取って行数・文字数・バイト数を表示するだけのツールでした。実際に手元で使い始めると、すぐに物足りなくなります。複数のファイルをまとめて数えたい、行数だけを知りたい、`--help` で使い方を確認したい。こうした要望はどれも、引数の受け取り方を整えるところから始まります。

この章では rwc を、複数のファイルを受け取り、表示する項目を選べるツールに育てます。

## 今の引数の扱いはどこで詰まるか

初級で読んだ `main.rs` は、引数を次のように受け取っていました。

```rust
let args: Vec<String> = env::args().collect();

if args.len() < 2 {
    eprintln!("エラー: ファイル名の指定がありません");
    process::exit(1);
}

let filename = &args[1];
```

`args[1]` を一つ取り出して、それをファイル名として扱う。シンプルですが、ここから機能を足そうとすると途端に苦しくなります。

ファイルを複数受け取りたいなら、`args[1]` だけでなく `args[2]`、`args[3]` と続きを順に見ていく処理を自分で書くことになります。さらに「行数だけ表示する」オプションを足すなら、`-l` という文字列が引数に含まれるかを自分で調べ、ファイル名と区別する必要があります。`--help` を出したいなら、ヘルプの文面も自分で用意して、どの引数のときに表示するかを判定しなければなりません。

引数が増えるほど、この「文字列を見て手で振り分ける」コードが膨らんでいきます。やりたいのはツールの中身を良くすることなのに、引数の解釈にばかり手を取られてしまう。ここを肩代わりしてくれる道具に任せるのが、最初の一歩です。

## 引数の解釈をライブラリに任せる

Rust には、コマンドライン引数の解釈を引き受けてくれる clap というライブラリがあります。「どんな引数を受け取りたいか」を構造体として宣言すると、文字列の振り分け・型変換・エラーメッセージ・ヘルプ表示までをまとめて用意してくれます。

プロジェクトに追加します。

```sh
$ cargo add clap --features derive
```

`--features derive` は、構造体の宣言から引数の解釈を導き出す機能を有効にするための指定です。これがあると、次のように書けます。

```rust
use clap::Parser;
use std::path::PathBuf;

#[derive(Parser)]
struct Args {
    /// 数えるファイル
    file: PathBuf,
}

fn main() {
    let args = Args::parse();
    println!("{}", args.file.display());
}
```

`struct Args` が「このツールが受け取る引数の形」です。`file` というフィールドを一つ持たせ、型を `PathBuf`（ファイルパスを表す型）にしています。`#[derive(Parser)]` を付けると、この宣言から引数を読み取るコードが自動で生成されます。

`main` の中の `Args::parse()` が、実際にコマンドライン引数を読み取って `Args` に詰める処理です。フィールドの上に書いた `/// 数えるファイル` というコメントは、後で `--help` を出したときに説明文として使われます。

これで、手で `args[1]` を取り出していた部分が消えました。ファイルが一つも渡されなければエラーを出す、という判定も clap が代わりにやってくれます。

この `main` はファイルを読んで数える処理（`fs::read_to_string` と `Counter::count`）を引き続き使うので、`use std::fs;` と `mod counter;`、`use counter::Counter;` はこれまで通り残します。一方で、手書きの引数処理で使っていた `use std::env;` と `use std::process;` は出番がなくなるので、消してかまいません。

## 複数のファイルを受け取る

ファイルを複数受け取れるようにします。変更は、フィールドの型を「一つのパス」から「パスの一覧」に変えるだけです。

```rust
#[derive(Parser)]
struct Args {
    /// 数えるファイル（複数指定できる）
    files: Vec<PathBuf>,
}
```

`PathBuf` を `Vec<PathBuf>` にしました。`Vec` は同じ型の値を並べて持つ型で、これだけで clap は「ファイル名をいくつ並べても受け取る」と解釈してくれます。一つだけ変わる点があります。一覧で受け取るようになったので、ファイルを一つも渡さなくてもエラーにはなりません。その場合は数えるものが無いので、何も表示せずに終わります。

受け取ったファイルは、一つずつ順に数えます。`main` を次のように書き替えます。

```rust
fn main() {
    let args = Args::parse();

    for path in &args.files {
        let content = match fs::read_to_string(path) {
            Ok(c) => c,
            Err(e) => {
                eprintln!("エラー: {}: {}", path.display(), e);
                continue;
            }
        };

        let result = Counter::count(&content);
        println!(
            "{}  lines: {}  chars: {}  bytes: {}",
            path.display(), result.lines, result.chars, result.bytes
        );
    }
}
```

`for path in &args.files` で、受け取ったファイルを先頭から一つずつ取り出します。中身を読み込んで `Counter::count` で数え、ファイル名と一緒に結果を表示する、という流れです。

初級では、ファイルが読めなかったら `process::exit(1)` でその場で終了していました。ここでは `continue` に変えています。複数のファイルを渡したとき、途中の一つが読めなくても、残りのファイルは数え続けたいからです。読めなかったファイルはエラーを表示して飛ばし、次に進みます。

二つのファイルを渡して動かします。

```sh
$ cargo run -- sample/hello.txt sample/japanese.txt
```

実行結果

```text
sample/hello.txt  lines: 3  chars: 16  bytes: 16
sample/japanese.txt  lines: 2  chars: 9  bytes: 23
```

ファイルごとに1行ずつ、まとめて結果が出るようになりました。

## 表示する項目を選べるようにする

今は行数・文字数・バイト数をいつも全部表示しています。行数だけ知りたいときもあるので、表示する項目を選べるオプションを足します。

`Args` にフラグを三つ追加します。

```rust
#[derive(Parser)]
struct Args {
    /// 数えるファイル（複数指定できる）
    files: Vec<PathBuf>,

    /// 行数を表示する
    #[arg(short = 'l', long)]
    lines: bool,

    /// 文字数を表示する
    #[arg(short = 'm', long)]
    chars: bool,

    /// バイト数を表示する
    #[arg(short = 'c', long)]
    bytes: bool,
}
```

`#[arg(short = 'l', long)]` は、このフィールドを `-l`（短い形）と `--lines`（長い形）の両方で指定できるようにする宣言です。型を `bool` にしているので、指定されれば `true`、指定されなければ `false` になります。短い形の文字は wc コマンドに合わせて、行を `-l`、文字を `-m`、バイトを `-c` にしています。

何も指定しなければ今まで通り全部表示し、どれかを指定したらそれだけを表示する、という挙動にします。`main` の表示部分を次のように組み立てます。

```rust
let show_all = !(args.lines || args.chars || args.bytes);

for path in &args.files {
    let content = match fs::read_to_string(path) {
        Ok(c) => c,
        Err(e) => {
            eprintln!("エラー: {}: {}", path.display(), e);
            continue;
        }
    };

    let result = Counter::count(&content);

    let mut parts = Vec::new();
    if args.lines || show_all {
        parts.push(format!("lines: {}", result.lines));
    }
    if args.chars || show_all {
        parts.push(format!("chars: {}", result.chars));
    }
    if args.bytes || show_all {
        parts.push(format!("bytes: {}", result.bytes));
    }

    println!("{}  {}", path.display(), parts.join("  "));
}
```

`show_all` は「どのフラグも指定されていない」ときに `true` になります。`!(... || ... || ...)` は、三つのうち一つでも指定されていれば `false`、一つも無ければ `true`、という意味です。

表示する項目は、いったん `parts` という一覧にためてから、最後に `join` でつなげて出します。こうすると、指定された項目だけを並べても、項目の間隔が崩れません。

行数だけを表示してみます。

```sh
$ cargo run -- --lines sample/japanese.txt
```

実行結果

```text
sample/japanese.txt  lines: 2
```

`-l` と短く書いても同じ結果になります。

## ヘルプとバージョンは自動で付いてくる

clap を使うと、`--help` の表示はこちらで書かなくても用意されます。試しに出してみます。

```sh
$ cargo run -- --help
```

実行結果

```text
Usage: rwc [OPTIONS] [FILES]...

Arguments:
  [FILES]...  数えるファイル（複数指定できる）

Options:
  -l, --lines  行数を表示する
  -m, --chars  文字数を表示する
  -c, --bytes  バイト数を表示する
  -h, --help   Print help
```

フィールドに書いた `///` のコメントが、そのまま各項目の説明になっています。`-h, --help` の行は、こちらで何もしなくても clap が足してくれたものです。

バージョン表示も足せます。`Args` の宣言に一行加えます。

```rust
#[derive(Parser)]
#[command(version)]
struct Args {
```

`#[command(version)]` を付けると、`Cargo.toml` に書かれているバージョン番号を使って `--version` が使えるようになります。

```sh
$ cargo run -- --version
```

実行結果

```text
rwc 0.1.0
```

バージョンを足すと、`--help` の一覧にも `-V, --version` の行が並ぶようになります。使い方の説明やバージョン表示は、ツールを人に渡すときに必ず要るものです。それが引数の宣言から自動で付いてくるのは、ライブラリに任せたことの大きな見返りです。

## 動かして確かめる

初級の rwc は、ファイルを一つ受け取って結果を出すだけでした。この章を終えた rwc は、複数のファイルを受け取り、表示する項目を選べて、使い方とバージョンを自分で説明できます。

```sh
$ cargo run -- sample/hello.txt sample/japanese.txt
sample/hello.txt  lines: 3  chars: 16  bytes: 16
sample/japanese.txt  lines: 2  chars: 9  bytes: 23

$ cargo run -- --lines sample/hello.txt
sample/hello.txt  lines: 3
```

引数まわりが整ったので、次の章ではこのツールを実際に人へ渡せるようにします。
