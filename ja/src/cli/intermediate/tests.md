# 自動テストを入れる

前の章で、rwc は読めない入力に出会っても落ち着いて振る舞い、失敗を終了コードで伝えられるようになりました。ツールとしての形は、一通りそろっています。

この章では、これから先も安心してコードを直していけるように、自動テストを用意します。

## なぜ自動テストか

新しい機能を足したときは、たいてい自分で動かして確かめます。実際にコマンドを打って、期待どおり出るかを目で見る。これは自然なことで、これからも変わりません。

問題は、そのあとです。別の場所を直したとき、前に動いていた部分が、気づかないうちに壊れることがあります。これをリグレッション（後戻り）と呼びます。厄介なのは、直した本人は「直したところ」しか見ていないので、離れた場所の後戻りに気づきにくいことです。かといって、どこかを直すたびに全機能を毎回目で確かめ直すのは、現実的ではありません。

手で動作を確かめるべき組み合わせが、いまの rwc にいくつあるか数えてみます。

まず、渡す引数の形がいくつもあります。

- ファイルを1つ: `rwc a.txt`
- ファイルを複数: `rwc a.txt b.txt`
- ディレクトリごと: `rwc dir/`
- ファイルとディレクトリの混在: `rwc a.txt dir/`
- 読めないファイルが混じる: `rwc a.txt nope.txt`

ざっと5通り。これに、表示する項目の指定が重なります。

- 何も付けない（行数・文字数・バイト数を全部出す）
- `-l` だけ / `-c` だけ / `-b` だけ
- `-l -c` / `-l -b` / `-c -b` の二つ組

こちらも7通りほど。単純に掛け合わせて、35通りです。

しかも1通りは、ひと目では済みません。たとえば `rwc a.txt nope.txt -l` を確かめるなら、a.txt の行数が合っているか、nope.txt のエラーが出ているか、読めた側は数え続けているか、最後に `echo $?` が `1` か——ここまで見て、ようやく1通りです。それを35回くり返します。

そのうえ、rwc の機能はこの先も増えます。合計行の表示、色付き出力、JSON 出力が加わります。表示の指定が一つ増えるだけで、35通りは一気に増える。入力の形が一つ増えても同じです。パターンは足し算ではなく掛け算で膨らむので、機能を足すほど、手で見直す手間はふくれ上がります。数回コードを直せば、もう手では追いきれません。

しかも rwc は、前の章ですでに人に配り始めています。手元だけで使っているうちは、後戻りに気づいた時点で直せば済みます。けれど配ったあとの後戻りは、相手の手元で起きます。配布を始めたということは、それだけ慎重にコードを直さないといけない、ということでもあります。

自動テストは、この「前は動いていた」を固定しておく仕組みです。一度書いておけば、`cargo test` の一言で、期待どおりの動きが保たれているかをまとめて確かめられます。手で見直す代わりに、機械に見張らせるわけです。

この章の後半では、その安全網を実際に働かせます。`main` の見通しを良くするために中身を少し組み替え、表向きの振る舞いが変わっていないことを、用意したテストで確かめます。手を入れても大丈夫だと機械が請け合ってくれる。テストがあると何が変わるのかを、そこで体験します。

## コマンドとして動かして確かめる

rwc のテストは、コマンドとして動かして、出力と終了コードを見る形にします。関数を一つずつ内側から呼ぶのではなく、`rwc sample/japanese.txt` のように実際に起動して、画面に出た文字と `$?` を確かめる、というやり方です。

こうする理由は二つあります。一つは、利用者が rwc に触れるのはコマンドの入口だけだからです。中の関数がどう分かれていても、利用者にとっての rwc は「引数を渡すと、こう出て、この終了コードで終わる」がすべてです。テストも同じ目線で見ておくと、確かめている内容が利用者の体験とそのまま重なります。

もう一つは、この章の後半で中身を組み替えるからです。関数を直接呼ぶテストは、関数の形を変えると一緒に書き直しになります。入口から見るテストは、出力と終了コードが同じである限り、中をどう組み替えても通り続けます。組み替えの前後で振る舞いが変わっていないことを、そのまま見張ってくれます。

これを助けてくれるライブラリを二つ入れます。

```sh
$ cargo add --dev assert_cmd predicates
```

入れた二つは、それぞれ役割が違います。

- `assert_cmd`: ビルドした rwc をテストの中から起動して、終了コードや出力を確かめる
- `predicates`: 「出力にこの文字が含まれる」といった、確かめ方を組み立てる

`--dev` を付けているのは、この二つがテストのときだけ要るライブラリで、配布する rwc 本体には含めないという指定です。追加すると、`Cargo.toml` の `[dependencies]` とは別に、`[dev-dependencies]` という欄が増えます。

```toml
[dependencies]
clap = { version = "4.6.1", features = ["derive"] }

[dev-dependencies]
assert_cmd = "2.2.2"
predicates = "3.1.4"
```

`[dependencies]` にある `clap` は rwc 本体が使うライブラリなので、配布物にも入ります。一方 `[dev-dependencies]` の二つはテストのときだけ使われ、`cargo build` で作る配布用の rwc には含まれません。テストのための道具が、配る中身を重くしないよう分けられている、というわけです。

## 最初のテストを書く

テストは `tests` というディレクトリに置きます。プロジェクトの直下に `tests` フォルダを作り、その中に `cli.rs` を用意します。`src` と並ぶ位置です。

```text
rwc/
├── Cargo.toml
├── sample/
├── src/
│   ├── main.rs
│   └── counter.rs
└── tests/
    └── cli.rs
```

`tests` の下に置いたファイルは、`cargo test` が本体とは別に、独立したテストとしてビルドして走らせてくれます。その中から `assert_cmd` で rwc を起動して、出力と終了コードを確かめる、という組み立てです。まず、ファイルを一つ渡したときの動きを書きます。

```rust
use assert_cmd::Command;
use predicates::prelude::*;

#[test]
fn counts_a_single_file() {
    Command::cargo_bin("rwc")
        .unwrap()
        .arg("sample/japanese.txt")
        .assert()
        .success()
        .stdout(predicate::str::contains("lines: 2"))
        .stdout(predicate::str::contains("chars: 9"))
        .stdout(predicate::str::contains("bytes: 23"));
}
```

`Command::cargo_bin("rwc")` で、ビルドした rwc を起動する準備をします。`.arg("sample/japanese.txt")` が渡す引数、`.assert()` が「ここから結果を確かめる」の合図です。`.success()` は終了コードが成功（`0`）であること、`.stdout(...)` は画面に出た文字にその一節が含まれること、を確かめます。手で `cargo run -- sample/japanese.txt` を打って目で見ていたことを、そのまま文章にした形です。

出力を丸ごと一致させるのではなく、`contains` で必要な一節だけを確かめているのは、表示の細かな並びが変わっても、確かめたい中身が合っていればテストが通るようにするためです。ここで見たいのは「日本語ファイルの行数・文字数・バイト数が正しく出るか」なので、その数字が出ていれば十分です。

次に、「なぜ自動テストか」で数えた組み合わせの中から、押さえておきたいものをいくつか足します。35通りを全部書くのではなく、動きの種類が違うものを選びます。まず、表示する項目を選ぶオプション。

```rust
#[test]
fn shows_only_lines_with_l_flag() {
    Command::cargo_bin("rwc")
        .unwrap()
        .args(["-l", "sample/japanese.txt"])
        .assert()
        .success()
        .stdout(predicate::str::contains("lines: 2"))
        .stdout(predicate::str::contains("chars:").not());
}
```

`-l` を付けたら行数だけが出る、というのを確かめます。行数が出ていることに加えて、`.not()` で「文字数は出ていない」ことも見ています。「これが出る」だけでなく「これは出ない」も押さえると、オプションが効いていることをきちんと確かめられます。

もう一つ、読めないファイルが混じったときの振る舞いです。前の章で整えた、いちばん確かめておきたいところです。

```rust
#[test]
fn reports_failure_but_keeps_counting() {
    Command::cargo_bin("rwc")
        .unwrap()
        .args(["sample/hello.txt", "nope.txt", "sample/japanese.txt"])
        .assert()
        .code(1)
        .stdout(predicate::str::contains("sample/hello.txt"))
        .stdout(predicate::str::contains("sample/japanese.txt"))
        .stderr(predicate::str::contains("nope.txt"));
}
```

読めない `nope.txt` を真ん中に挟んで渡します。確かめるのは三つ。終了コードが `1` であること（`.code(1)`）、その前後にある `hello.txt` と `japanese.txt` はちゃんと数え続けていること、読めなかった `nope.txt` はエラー側（`stderr`）に知らせが出ていること。読めるものは最後まで数えつつ、失敗は終了コードで伝える。前の章で手を入れた振る舞いが、これで固定されます。

三つ書けたので、動かします。

```sh
$ cargo test
```

実行結果（`Running` の行に続く括弧内は、環境ごとに変わる識別子なので省いています）

```text
     Running unittests src/main.rs
running 2 tests
test counter::tests::counts_lines_chars_bytes ... ok
test counter::tests::counts_multibyte_chars ... ok

test result: ok. 2 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out

     Running tests/cli.rs
running 3 tests
test counts_a_single_file ... ok
test reports_failure_but_keeps_counting ... ok
test shows_only_lines_with_l_flag ... ok

test result: ok. 3 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

`Running unittests src/main.rs` の下の二つは、初級で `counter.rs` に書いた、数え方そのもののテストです。`Running tests/cli.rs` の下の三つが、いま足したコマンドのテストです。`cargo test` は、本体の中のテストと `tests` のテストを、まとめて走らせてくれます。全部 `ok` で、いまの rwc の動きがひととおり固定できました。

## 読み込みを関数に切り出す

安全網ができました。ここで、前の章まで少しずつ書き足してきた `main` のループを、省略せずに全部並べて見てみます。

```rust
    for path in &targets {
        let content = match fs::read_to_string(path) {
            Ok(c) => c,
            Err(e) => {
                eprintln!("エラー: {}: {}", path.display(), e);
                had_error = true;
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

一つの `for` の中で、ずいぶん多くのことをやっています。ファイルを読み、読めなければ知らせて飛ばし、読めたら数え、どの項目を出すか決め、最後に並べて表示する。章をまたいで少しずつ足してきた結果、いつのまにかこれだけ積み上がりました。

とくに引っかかるのが、ループの頭です。`match fs::read_to_string(...)` から始まるひとかたまりは、読めなかったときの後始末で場所を取っていて、字面のわりに「ファイルを読んで中身を得る」ことしか言っていません。このループが結局やりたいのは、ファイルごとに数えて表示することです。なのにそこへ入る前に、まず読み込みの手続きを読まされます。

そこで、この「パスを渡すと、数えた結果が返る」という一番手前の部分に名前を付けて、関数に切り出します。

```rust
fn count_file(path: &Path) -> io::Result<Counter> {
    let content = fs::read_to_string(path)?;
    Ok(Counter::count(&content))
}
```

戻り値の `io::Result<Counter>` は、「うまくいけば数えた結果（`Counter`）、読めなければ失敗を返す」という型です。ファイルを読む `fs::read_to_string` は失敗しうるので、成功の値だけでなく、失敗の可能性も型に含めておきます。

注目してほしいのは、`fs::read_to_string(path)` のうしろに付いた `?` です。これは「読めたら中身を取り出して先へ進む、読めなければここで切り上げて、その失敗をそのまま呼び出し元へ返す」という一文字です。読めたときだけ次の `Counter::count` に進み、読めなければ数えずに失敗を返す。`match` で書いていた「読めたら取り出す／読めなければどうする」の分岐が、この関数の中では `?` の一文字に収まりました。ただし、読めなかったときに何をするか（エラーを知らせて次へ進むのか、止まるのか）は、この `?` では決めていません。それは失敗を受け取る側、つまり `main` の仕事になります。次で見ます。

`Path` と `io` を新しく使うので、ファイル先頭の `use` をそろえます。パスの型に `Path` を足し、`io` を新しく入れます。

```rust
use std::io;
use std::path::{Path, PathBuf};
```

呼ぶ側の `main` は、次のようになります。

```rust
    for path in &targets {
        let result = match count_file(path) {
            Ok(r) => r,
            Err(e) => {
                eprintln!("エラー: {}: {}", path.display(), e);
                had_error = true;
                continue;
            }
        };

        // 表示する部分は、これまでと同じ
    }
```

ループの頭が変わりました。さっきは `fs::read_to_string` の呼び出しから始まって、読めたら取り出す・読めたら数える、と読み込みの手続きが並んでいました。いまは `count_file(path)` の一手です。「どうやって読むか」は関数の側へ移り、ここは「このパスの、数えた結果を受け取る」とだけ読めます。表示の部分は前と同じで、手はつけていません。

派手な短縮ではありません。消えたのは、頭で読み込みを説明していた数行だけです。それでも、ループを追う人が「まず読み込みの段取り」からではなく「数えた結果を受け取るところ」から読み始められる。小さな関数に名前を付けて手続きを預けると、呼ぶ側はそのぶん筋だけを追える、という積み重ねです。

さきほど「読めなかったときにどうするかは受け取る側で決める」と書きました。それがこの `match` です。`?` が切り上げるのは `count_file` の中だけで、失敗はいったん `main` に戻ってきます。だから `?` を使っても、読めないファイルで rwc 全体が止まることはありません。`main` は今までどおり失敗を受け止め、エラーを知らせて `had_error` を立て、`continue` で次へ進みます。読めるものは最後まで数え、最後に終了コードへ反映する。この振る舞いは、切り出す前と変わっていません。

## 組み替えても壊れていないことを確かめる

中身を組み替えました。狙いどおり表向きの振る舞いが変わっていないかは、さっき用意したテストが答えてくれます。もう一度走らせます。

```sh
$ cargo test
```

結果は、さっきと同じです。

```text
test result: ok. 2 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out

test result: ok. 3 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

全部 `ok` のままです。ファイルを一つ渡したときの結果も、`-l` を付けたときの絞り込みも、読めないファイルを混ぜたときの終了コードも、切り出す前と同じでした。コードの形は変わったのに、利用者から見た rwc は変わっていない、と機械が確かめてくれたことになります。

これが、先にテストを書いておくことの見返りです。手を入れる前に「今の正しい動き」を固定しておけば、あとは安心して中を組み替えられます。テストが赤くなればそこで振る舞いを壊したと分かるし、緑のままなら外から見た動きは保たれている、という目安になります。

これで rwc は、複数のファイルとディレクトリを受け取り、表示する項目を選べて、失敗を終了コードで伝え、人に配れて、直しても壊れていないと確かめられるところまで来ました。ここから先、機能を足していくときも、まず動きをテストに書いてから手を入れる。この順番で進めれば、rwc を安心して育てていけます。
