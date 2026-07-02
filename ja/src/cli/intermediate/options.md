# オプションで表示を選ぶ

前の章で、rwc は複数のファイルやディレクトリを受け取れるようになりました。ただ、表示はいつも行数・文字数・バイト数の全部です。行数だけ知りたいときもあります。この章では、表示する項目を選ぶオプションを足し、ついでに clap が用意してくれるヘルプとバージョン表示も受け取ります。

## 表示する項目を選べるようにする

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
    #[arg(short = 'c', long)]
    chars: bool,

    /// バイト数を表示する
    #[arg(short = 'b', long)]
    bytes: bool,
}
```

`#[arg(short = 'l', long)]` は、このフィールドを `-l`（短い形）と `--lines`（長い形）の両方で指定できるようにする宣言です。型を `bool` にしているので、指定されれば `true`、指定されなければ `false` になります。短い形の文字は、頭文字に合わせて行を `-l`（lines）、文字を `-c`（chars）、バイトを `-b`（bytes）にしています。

> 行数・文字数・バイト数を数える定番ツール `wc` では、文字数が `-m`、バイト数が `-c` です。`wc` は歴史的にバイト数を `-c` に割り当てていて、あとから足された文字数のほうが `-m`（multibyte）になりました。ここでは頭文字どおりの素直な割り当てにしていますが、`wc` に慣れていると `-c` の意味が食い違う点だけ覚えておいてください。

何も指定しなければ今まで通り全部表示し、どれかを指定したらそれだけを表示する、という挙動にします。`main` の表示部分を次のように組み立てます。前の章で用意した `collect_targets` と `targets` はそのまま使います。

```rust
let args = Args::parse();
let show_all = !(args.lines || args.chars || args.bytes);
let targets = collect_targets(&args.files);

for path in &targets {
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

```sh
$ cargo run -- -l sample/japanese.txt
```

実行結果

```text
sample/japanese.txt  lines: 2
```

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
  -c, --chars  文字数を表示する
  -b, --bytes  バイト数を表示する
  -h, --help   Print help
```

フィールドに書いた `///` のコメントが、そのまま各項目の説明になっています。`-h, --help` の行は、こちらで何もしなくても clap が足してくれたものです。

バージョン表示も足せます。`Args` の宣言に一行加えます。

```rust
#[derive(Parser)]
#[command(version)]
struct Args {
```

`#[command(version)]` を付けると、`Cargo.toml` に書かれているバージョン番号を使って `--version` が使えるようになります。バージョン番号は、プロジェクトを作ったときから `Cargo.toml` の `[package]` にあります。

```toml
[package]
name = "rwc"
version = "0.1.0"
edition = "2021"
```

この `version = "0.1.0"` が、そのまま次の `--version` の出力に使われます。

```sh
$ cargo run -- --version
```

実行結果

```text
rwc 0.1.0
```

バージョンを足すと、`--help` の一覧にも `-V, --version` の行が並ぶようになります。使い方の説明やバージョン表示は、ツールを配布するときに必ず要るものです。それが引数の宣言から自動で付いてくるのは、ライブラリに任せたことの大きな見返りです。

## 動かして確かめる

ここまでの二つの章を終えた rwc は、複数のファイルやディレクトリを受け取り、表示する項目を選べて、使い方とバージョンを自分で説明できます。

```sh
$ cargo run -- sample/hello.txt sample/japanese.txt
sample/hello.txt  lines: 3  chars: 16  bytes: 16
sample/japanese.txt  lines: 2  chars: 9  bytes: 23

$ cargo run -- sample/
sample/hello.txt  lines: 3  chars: 16  bytes: 16
sample/japanese.txt  lines: 2  chars: 9  bytes: 23

$ cargo run -- --lines sample/hello.txt
sample/hello.txt  lines: 3
```

引数まわりが整ったので、次の章ではこのツールを実際に配布できるようにします。
