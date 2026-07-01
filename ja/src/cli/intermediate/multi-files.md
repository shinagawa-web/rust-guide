# 複数のファイルとディレクトリを受け取る

初級の rwc は、ファイルを一つ受け取って行数・文字数・バイト数を表示するだけのツールでした。実際に手元で使い始めると、すぐに物足りなくなります。複数のファイルをまとめて数えたい、フォルダごと数えたい、行数だけを知りたい。こうした要望はどれも、引数の受け取り方を整えるところから始まります。

まずこの章で、受け取れるものを増やします。手書きの引数処理を clap というライブラリに置き換え、複数のファイルやディレクトリをまとめて渡せるようにします。表示する項目を選ぶオプションは、次の章で足します。

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

Rust には、コマンドライン引数の解釈を引き受けてくれる [clap](https://docs.rs/clap) というライブラリがあります。「どんな引数を受け取りたいか」を構造体として宣言すると、文字列の振り分け・型変換・エラーメッセージ・ヘルプ表示までをまとめて用意してくれます。

プロジェクトに追加します。

```sh
$ cargo add clap --features derive
```

`--features derive` は、このあとの書き方を使えるようにするための指定です。付けておくと、次のように書けます。

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

`struct Args` が「このツールが受け取る引数の形」です。関連する値をひとまとめにするのが構造体で、初級で読んだ `Counter` と同じ書き方です。ここではファイルのパスを表す `file` というフィールドを一つだけ持たせています（`PathBuf` はファイルパスを表す型です）。

その上に付いている `#[derive(Parser)]` が肝心なところです。これは「この構造体をもとに、コマンドライン引数を読み取る処理を自動で作ってくれ」という目印です。さきほど `--features derive` を付けたのは、この `#[derive(Parser)]` を使えるようにするためでした。

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

## ディレクトリごと数える

ファイルが増えてくると、一つずつ名前を並べるのが面倒になります。`sample` ディレクトリの中身を全部数えたいだけなのに、`sample/hello.txt sample/japanese.txt` と手で並べるのは手間です。ディレクトリを渡したら中のファイルを数えてくれると助かります。

そこで、数える前にひと手間を挟みます。受け取った引数を見て、ディレクトリならその中のファイルに置き換える処理です。これを `collect_targets` という関数にまとめます。

```rust
fn collect_targets(inputs: &[PathBuf]) -> Vec<PathBuf> {
    let mut targets = Vec::new();

    for path in inputs {
        if !path.is_dir() {
            targets.push(path.clone());
            continue;
        }

        let entries = match fs::read_dir(path) {
            Ok(entries) => entries,
            Err(e) => {
                eprintln!("エラー: {}: {}", path.display(), e);
                continue;
            }
        };

        let mut files: Vec<PathBuf> = entries
            .flatten()
            .map(|entry| entry.path())
            .filter(|child| child.is_file())
            .collect();
        files.sort();
        targets.extend(files);
    }

    targets
}
```

受け取った引数を一つずつ見ていきます。`path.is_dir()` がディレクトリかどうかの判定です。ディレクトリでなければ、そのまま `targets` に加えて次へ進みます。

ディレクトリのときは、`fs::read_dir` で中の一覧を読み取ります。読めなければ、ファイルのときと同じようにエラーを知らせて飛ばします。読み取れた一覧は、`flatten` で読めたものだけを通し、`map` で各エントリのパスを取り出し、`filter` でファイルだけに絞り込みます。`is_file()` で絞っているので、中にさらにディレクトリがあっても、そこには潜りません。対象は直下のファイルだけです。

最後の `files.sort()` は、名前順に並べるための一行です。`read_dir` が返す順番は環境によって変わるので、並べ替えておくと、いつ実行しても同じ順で表示されます。

あとは `main` で、数える前にこの関数を通すだけです。変えるのは二か所、`collect_targets` を呼ぶ一行を足すことと、回す対象を `&args.files` から `&targets` にすることだけです。

```rust
fn main() {
    let args = Args::parse();

    let targets = collect_targets(&args.files);

    for path in &targets {
        // 中身を数えて表示する部分は、これまでと同じ
    }
}
```

`sample` ディレクトリを丸ごと渡してみます。

```sh
$ cargo run -- sample/
```

実行結果

```text
sample/hello.txt  lines: 3  chars: 16  bytes: 16
sample/japanese.txt  lines: 2  chars: 9  bytes: 23
```

中のファイルが、名前順にまとめて数えられました。

## 動かして確かめる

初級の rwc は、ファイルを一つ受け取るだけでした。ここまでで、複数のファイルも、ディレクトリごとも受け取れるようになりました。

```sh
$ cargo run -- sample/hello.txt sample/japanese.txt
sample/hello.txt  lines: 3  chars: 16  bytes: 16
sample/japanese.txt  lines: 2  chars: 9  bytes: 23

$ cargo run -- sample/
sample/hello.txt  lines: 3  chars: 16  bytes: 16
sample/japanese.txt  lines: 2  chars: 9  bytes: 23
```

受け取る側が整いました。次の章では、表示する項目を選べるオプションを足していきます。
