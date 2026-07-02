# エラー処理を整える

前の章までで、rwc は複数のファイルやディレクトリを受け取り、人に配布できるところまで来ました。ここからは、配布したあとに待っている「こちらの想定しない入力」に耐えられるよう、エラーまわりを整えます。

## 今のツールの問題点

想定しない入力を渡して動かしてみると、いまの rwc には、はっきりした問題が一つあります。読めないファイルがあっても、終了コードは成功のまま終わることです。呼び出した側は、失敗したことに気づけません。

まずこの問題を直します。そのうえで、この先の機能追加でうっかり panic で落とさないための注意もまとめます。

## 失敗しても成功で終わっている

まず、いまの振る舞いを確かめます。読めないファイルを混ぜて実行します。

```sh
$ rwc sample/hello.txt nope.txt sample/japanese.txt
sample/hello.txt  lines: 3  chars: 16  bytes: 16
エラー: nope.txt: No such file or directory (os error 2)
sample/japanese.txt  lines: 2  chars: 9  bytes: 23
```

エラー行は出ています。では、このコマンドが成功したのか失敗したのかを、直後に確かめます。

```sh
$ echo $?
0
```

`$?` は直前のコマンドの終了コードで、`0` は成功を表します。nope.txt を数えられなかったのに、rwc は「成功した」と名乗って終わっています。

画面を見ているうちは、エラー行が出るので気づけます。困るのは、rwc を別のプログラムから呼んだときです。`rwc ... && 次の処理` とつなぐと、rwc が失敗しても次の処理が走ってしまいます。終了コードは、機械が成否を判断するための唯一の合図です。ここが実態と食い違うと、失敗が静かに見過ごされます。

## 終了コードに失敗を伝える

直し方は単純です。「一度でも読めなかったか」を覚えておき、最後にそれを終了コードへ反映します。まず、ファイルを読むループに、失敗を覚えるフラグを足します。

```rust
    let mut had_error = false;

    for path in &targets {
        let content = match fs::read_to_string(path) {
            Ok(c) => c,
            Err(e) => {
                eprintln!("エラー: {}: {}", path.display(), e);
                had_error = true;
                continue;
            }
        };

        // 数えて表示する部分は、これまでと同じ
    }

    if had_error {
        process::exit(1);
    }
```

読めなかったときに `had_error = true` を立て、ループを抜けたあと、立っていれば `process::exit(1)` で終了コードを `1` にして終わります。`process` を使うので、ファイル先頭に `use std::process;` を戻します。初級では使っていましたが、clap に置き換えたときに一度消したものです。

もう一か所あります。ディレクトリの一覧が読めなかったときも、同じ「失敗」です。`collect_targets` も、読めないディレクトリに出会ったかどうかを呼び出し元へ返すようにします。

```rust
fn collect_targets(inputs: &[PathBuf]) -> (Vec<PathBuf>, bool) {
    let mut targets = Vec::new();
    let mut had_error = false;

    for path in inputs {
        if !path.is_dir() {
            targets.push(path.clone());
            continue;
        }

        let entries = match fs::read_dir(path) {
            Ok(entries) => entries,
            Err(e) => {
                eprintln!("エラー: {}: {}", path.display(), e);
                had_error = true;
                continue;
            }
        };

        // ファイルだけ集めて並べる部分は、これまでと同じ
    }

    (targets, had_error)
}
```

戻り値を「パスの一覧」から「一覧と、失敗があったか」の組に変えました。受け取る `main` 側も、それに合わせます。

```rust
    let (targets, mut had_error) = collect_targets(&args.files);
```

`collect_targets` が失敗を報告してくれば、`had_error` は最初から `true` で始まります。あとはファイルのループで読めないものに出会うたびに `true` を立て、最後にまとめて終了コードへ反映されます。

直したうえで、さっきと同じコマンドをもう一度試します。

```sh
$ rwc sample/hello.txt nope.txt sample/japanese.txt
sample/hello.txt  lines: 3  chars: 16  bytes: 16
エラー: nope.txt: No such file or directory (os error 2)
sample/japanese.txt  lines: 2  chars: 9  bytes: 23
$ echo $?
1
```

表示は変わりませんが、終了コードが `1` になりました。読めるファイルは最後まで数えつつ、「一つでも失敗した」ことを呼び出した側へ伝えられます。

## unwrap を避ける

最後に、この先コードを足していくときの注意を一つ。

rwc は、失敗しうるところ——`read_to_string` や `read_dir`——を、すべて `match` で受けています。だから、読めないファイルに当たっても、報告して次へ進めます。

Rust には、`Result` から中身を手早く取り出す `unwrap()` という方法もあります。ただしこれは、失敗するとその場でプログラムを止めます（panic と呼びます）。もし読み込みを `match` ではなく `unwrap` で書いていたら、どうなるか。

```rust
let content = fs::read_to_string(path).unwrap();
```

読めないファイルに当たった瞬間、こうなります。

```text
thread 'main' panicked at src/main.rs:...:
called `Result::unwrap()` on an `Err` value: Os { code: 2, kind: NotFound, message: "No such file or directory" }
```

一つ読めなかっただけで、残りのファイルも数えないまま、プログラム全体が止まります。メッセージも、利用者向けというより開発者向けの中身です。いまの rwc が読めないファイルを飛ばして続けられるのは、`unwrap` を使わず、失敗を `match` で受けているからです。

`unwrap`（と、よく似た `expect`）は、「ここは絶対に失敗しない」と言い切れるときの近道です。ファイルやユーザーの入力のように、外の世界に触れて失敗しうるところでは使わない。返ってきた `Result` を受け止めて、報告するなり飛ばすなりする。これが、想定外の入力でも落とさないための一線です。

## 動かして確かめる

この章で、rwc は失敗をきちんと外へ伝えられるようになりました。読めるファイルだけのときは、これまでどおり数えて、成功で終わります。

```sh
$ rwc sample/hello.txt sample/japanese.txt
sample/hello.txt  lines: 3  chars: 16  bytes: 16
sample/japanese.txt  lines: 2  chars: 9  bytes: 23
$ echo $?
0
```

読めないファイルが混じっても、そこでは止まりません。読めなかったものだけ知らせ、残りは数え続け、最後に「失敗があった」ことを終了コードで返します。

```sh
$ rwc sample/hello.txt nope.txt sample/japanese.txt
sample/hello.txt  lines: 3  chars: 16  bytes: 16
エラー: nope.txt: No such file or directory (os error 2)
sample/japanese.txt  lines: 2  chars: 9  bytes: 23
$ echo $?
1
```

見た目の出力は前の章とほとんど変わりませんが、成功と失敗を取り違えなくなりました。パイプやスクリプトから呼んでも、rwc の成否が正しく伝わります。

次の章では、こうして育てたコードを、壊さずに直していけるようにします。手を入れても今までどおり動くと確かめられる仕組み——テスト——を用意します。
