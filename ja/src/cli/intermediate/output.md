# 出力を整える

前の章までで、rwc はツールとして一通り動き、直しても壊れていないと確かめられるようになりました。最後に整えるのは、出力そのものです。

rwc の結果を受け取る相手は、大きく二種類います。一つは、端末に出た結果を目で読む人。もう一つは、その結果を受け取って動く別のプログラムです。求めるものは違います。人は、たくさん並んだ数字の中から合計をひと目で知りたいし、どこがファイル名でどこが数字か見分けたい。プログラムは、色や体裁より、決まった形で並んでいるほうが扱いやすい。

この章では、その両方に向けて出力を整えます。まず複数ファイルの合計を出し、端末では色を付けて読みやすくし、最後に、プログラムが扱いやすい形でも出せるようにします。

## 合計を出す

複数のファイルを渡すと、rwc は一行ずつ結果を並べます。ファイルが増えてくると、全部でいくつなのかを最後に知りたくなります。数える対象が多いほど、一つずつ足し算するのは面倒です。そこで、最後に合計の行を足します。

```text
sample/hello.txt  lines: 3  chars: 16  bytes: 16
sample/japanese.txt  lines: 2  chars: 9  bytes: 23
total  lines: 5  chars: 25  bytes: 39
```

合計を出すには、各ファイルの結果を足し合わせながらループを回り、最後にまとめて表示します。ここで一つ、先に手を入れておきたいところがあります。

いまの `main` は、表示する項目を選ぶ部分（`lines` を出すか、`chars` を出すか、`bytes` を出すか）をループの中に直接書いています。

```rust
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
```

合計の行も、同じ規則で項目を選びます。`--lines` を付けていれば、合計も行数だけを出したい。つまり、この「どの項目を、どう並べるか」という処理が、各ファイルの行と合計の行の二か所で要ります。同じものを二度書く代わりに、関数に切り出しておきます。

```rust
fn format_counts(c: &Counter, args: &Args, show_all: bool) -> String {
    let mut parts = Vec::new();
    if args.lines || show_all {
        parts.push(format!("lines: {}", c.lines));
    }
    if args.chars || show_all {
        parts.push(format!("chars: {}", c.chars));
    }
    if args.bytes || show_all {
        parts.push(format!("bytes: {}", c.bytes));
    }
    parts.join("  ")
}
```

数えた結果（`Counter`）と、どの項目を出すかの指定を受け取り、`lines: 3  chars: 16  bytes: 16` のような一行分の文字列を組み立てて返します。これで、各ファイルの行も合計の行も、この関数を呼ぶだけで同じ体裁になります。

`main` を書き替えます。合計をためる入れ物を用意し、各ファイルを数えるたびに足していきます。

```rust
    let mut total = Counter { lines: 0, chars: 0, bytes: 0 };
    let mut counted = 0;

    for path in &targets {
        let result = match count_file(path) {
            Ok(r) => r,
            Err(e) => {
                eprintln!("エラー: {}: {}", path.display(), e);
                had_error = true;
                continue;
            }
        };

        total.lines += result.lines;
        total.chars += result.chars;
        total.bytes += result.bytes;
        counted += 1;

        println!("{}  {}", path.display(), format_counts(&result, &args, show_all));
    }

    if counted >= 2 {
        println!("total  {}", format_counts(&total, &args, show_all));
    }
```

`total` は、行数・文字数・バイト数をすべて `0` から始めた `Counter` です。ファイルを一つ数えるたびに、その結果を `total` に足し込みます。読めなかったファイルは `continue` で飛ばすので、合計には数えられたファイルだけが入ります。

`counted` は、実際に数えられたファイルの数です。合計の行は、二つ以上のファイルを数えたときだけ出します。ファイルが一つなら、その行と合計が同じ数字になって意味がないからです。

表示している行が、`format_counts` を通すだけになりました。各ファイルの行では結果を、合計の行では `total` を渡す。項目の選び方は関数の中に一つだけあるので、`--lines` を付ければ、各行も合計も同じように行数だけになります。

動かして確かめます。二つのファイルを渡すと、最後に合計が出ます。

```sh
$ cargo run -- sample/hello.txt sample/japanese.txt
sample/hello.txt  lines: 3  chars: 16  bytes: 16
sample/japanese.txt  lines: 2  chars: 9  bytes: 23
total  lines: 5  chars: 25  bytes: 39
```

`--lines` を付ければ、合計も行数だけになります。

```sh
$ cargo run -- --lines sample/hello.txt sample/japanese.txt
sample/hello.txt  lines: 3
sample/japanese.txt  lines: 2
total  lines: 5
```

読めないファイルが混じっても、そこは飛ばして、読めたものだけの合計が出ます。

```sh
$ cargo run -- sample/hello.txt nope.txt sample/japanese.txt
sample/hello.txt  lines: 3  chars: 16  bytes: 16
エラー: nope.txt: No such file or directory (os error 2)
sample/japanese.txt  lines: 2  chars: 9  bytes: 23
total  lines: 5  chars: 25  bytes: 39
```

## 端末なら色を付ける

ファイルが増えると、数字とファイル名が画面いっぱいに並びます。端末で眺めるとき、どこがファイル名でどこが数字か、色分けされていると目で追いやすくなります。ファイル名は明るい青、数字は緑、というふうに色を付けてみます。

色は、エスケープシーケンスという特別な文字列で指定します。たとえば `\x1b[94m` は「ここから明るい青にする」、`\x1b[0m` は「色の指定を元に戻す」という合図です。この二つで文字列を挟むと、その部分だけ色が付きます。端末はこの合図を読み取って、実際に色を変えて表示します。

ただし、注意がいります。この合図を読み取って色に変えてくれるのは端末だけです。端末以外に送っても色にはならず、`\x1b[94m` のような合図の文字が、そのまま出力に紛れ込みます。rwc の出力は、画面に出すだけでなく、パイプで別のコマンドに渡したり、ファイルに保存したりもします。そこへこの文字が混ざると、受け取った側では邪魔なゴミにしかなりません。

そこで、出力先が端末かどうかで色を付けるかを決めます。標準ライブラリの `IsTerminal` を使うと、これが分かります。

```rust
use std::io::IsTerminal;
```

`io::stdout().is_terminal()` は、出力先が端末なら `true`、パイプやファイルなら `false` を返します。これを一度調べておき、色を付けるかどうかの判断に使います。

```rust
    let color = io::stdout().is_terminal();
```

色を付ける処理を、小さな関数にまとめます。`color` が `true` のときだけエスケープシーケンスで挟み、`false` のときは文字列をそのまま返します。

```rust
fn paint(text: &str, code: &str, color: bool) -> String {
    if color {
        format!("\x1b[{}m{}\x1b[0m", code, text)
    } else {
        text.to_string()
    }
}
```

`code` には、色を表す番号を渡します。この番号は決まっていて、`31` が赤、`32` が緑、`34` が青、というように `30` 番台が基本の色です。それぞれに明るい版があり、`90` 番台がそれにあたります。`94` は明るい青、`90` は「明るい黒」、つまり灰色です。どの番号がどの色か、その一覧は [ANSI エスケープコードの一覧表](https://en.wikipedia.org/wiki/ANSI_escape_code#Select_Graphic_Rendition_parameters) にまとまっています。ここを見ながら、使いたい色の番号を選びました。今回はファイル名を明るい青、数字を緑、合計を灰色にするので、その三つを、名前を付けて定数にしておきます。ファイル先頭あたりに置きます。

```rust
const BLUE: &str = "94";
const GREEN: &str = "32";
const GRAY: &str = "90";
```

あとは、色を付けたいところを `paint` に通すだけです。まず、数字を緑にします。合計の章で作った `format_counts` に `color` を一つ足し、各数字を `paint` で挟みます。

```rust
fn format_counts(c: &Counter, args: &Args, show_all: bool, color: bool) -> String {
    let mut parts = Vec::new();
    if args.lines || show_all {
        parts.push(format!("lines: {}", paint(&c.lines.to_string(), GREEN, color)));
    }
    if args.chars || show_all {
        parts.push(format!("chars: {}", paint(&c.chars.to_string(), GREEN, color)));
    }
    if args.bytes || show_all {
        parts.push(format!("bytes: {}", paint(&c.bytes.to_string(), GREEN, color)));
    }
    parts.join("  ")
}
```

`lines:` などのラベルはそのままで、数字だけを色で挟んでいます。`main` 側では、ファイル名を青に、合計の `total` を灰色にします。

```rust
        let name = paint(&path.display().to_string(), BLUE, color);
        println!("{}  {}", name, format_counts(&result, &args, show_all, color));
```

```rust
    if counted >= 2 {
        let label = paint("total", GRAY, color);
        println!("{}  {}", label, format_counts(&total, &args, show_all, color));
    }
```

端末で動かすと、ファイル名・数字・合計が色分けされて出ます。

<pre style="background:#1c1c1c;color:#d0d0d0;padding:1rem;border-radius:6px;overflow:auto;line-height:1.5"><span style="color:#8a8a8a">$ cargo run -- sample/hello.txt sample/japanese.txt</span>
<span style="color:#4fb3ff">sample/hello.txt</span>  lines: <span style="color:#c7e17b">3</span>  chars: <span style="color:#c7e17b">16</span>  bytes: <span style="color:#c7e17b">16</span>
<span style="color:#4fb3ff">sample/japanese.txt</span>  lines: <span style="color:#c7e17b">2</span>  chars: <span style="color:#c7e17b">9</span>  bytes: <span style="color:#c7e17b">23</span>
<span style="color:#8a8a8a">total</span>  lines: <span style="color:#c7e17b">5</span>  chars: <span style="color:#c7e17b">25</span>  bytes: <span style="color:#c7e17b">39</span></pre>

一方、同じコマンドの出力をパイプでほかのコマンドに渡すと、色は付きません。`is_terminal()` が `false` を返すので、`paint` は文字列をそのまま返します。

```sh
$ cargo run -- sample/hello.txt sample/japanese.txt | cat
sample/hello.txt  lines: 3  chars: 16  bytes: 16
sample/japanese.txt  lines: 2  chars: 9  bytes: 23
total  lines: 5  chars: 25  bytes: 39
```

画面で読むときは色付き、別のプログラムに渡すときはプレーン。同じ rwc が、出力先に応じて出し分けます。色を付けるかどうかを利用者にオプションで選ばせなくても、たいていの場面で期待どおりに振る舞います。

## JSON で出力する

ここまでの出力は、人が目で読むための形でした。一方、rwc の結果を別のプログラムに渡したいこともあります。たとえば「行数が一定を超えていないか」をスクリプトで自動的に確かめたり、別のツールに数字を取り込んだり。そういう相手には、`lines: 3` のような読ませる体裁より、決まった構造で並んだデータのほうが扱いやすい。そこで、`--json` を付けたら JSON で出せるようにします。

JSON は、多くの言語やツールが読み書きできる、データの標準的な形式の一つです。今回は、ファイルごとの結果を並べた配列で出します。

```text
[
  {"file": "sample/hello.txt", "lines": 3, "chars": 16, "bytes": 16},
  {"file": "sample/japanese.txt", "lines": 2, "chars": 9, "bytes": 23}
]
```

まず、`Args` に `--json` を足します。

```rust
    /// JSON で出力する
    #[arg(long)]
    json: bool,
```

出力の形が根本から変わるので、`--json` が付いていたら、これまでの行ごとの表示ではなく、JSON を組み立てて出します。ファイル名は文字列としてそのまま JSON に埋め込むのですが、ここで一つ気をつけることがあります。ファイル名に `"` や `\` が入っていると、そのままでは JSON の文法が壊れます。JSON では、文字列の中の `"` は `\"`、`\` は `\\` と書く決まりなので、埋め込む前にこの二つを置き換えておきます。

```rust
fn json_escape(s: &str) -> String {
    s.replace('\\', "\\\\").replace('"', "\\\"")
}
```

`\` を先に置き換えるのが大事です。順番を逆にすると、`"` を `\"` に変えたあとの `\` まで二重に置き換えてしまいます。

`main` のループで、`--json` のときは行を表示する代わりに、ファイル一つ分の JSON を組み立ててためておきます。

```rust
    let mut json_items = Vec::new();

    for path in &targets {
        // 数える部分はこれまでと同じ

        if args.json {
            json_items.push(format!(
                "  {{\"file\": \"{}\", \"lines\": {}, \"chars\": {}, \"bytes\": {}}}",
                json_escape(&path.display().to_string()),
                result.lines,
                result.chars,
                result.bytes
            ));
        } else {
            let name = paint(&path.display().to_string(), BLUE, color);
            println!("{}  {}", name, format_counts(&result, &args, show_all, color));
        }
    }
```

`format!` の中の `{{` と `}}` は、波かっこそのものを出すための書き方です。`format!` は `{}` を値の差し込みに使うので、かっこ自体を出したいときは二つ重ねます。JSON では、色や項目の選択は関係ありません。データとして全部の項目をそのまま並べます。

ループを抜けたら、ためた一覧を配列の形にして出します。`--json` でないときは、これまでどおり合計の行を出します。

```rust
    if args.json {
        println!("[\n{}\n]", json_items.join(",\n"));
    } else if counted >= 2 {
        let label = paint("total", GRAY, color);
        println!("{}  {}", label, format_counts(&total, &args, show_all, color));
    }
```

`json_items.join(",\n")` で、ためた各行をカンマと改行でつなぎ、前後を `[` と `]` で挟みます。動かしてみます。

```sh
$ cargo run -- --json sample/hello.txt sample/japanese.txt
[
  {"file": "sample/hello.txt", "lines": 3, "chars": 16, "bytes": 16},
  {"file": "sample/japanese.txt", "lines": 2, "chars": 9, "bytes": 23}
]
```

読めないファイルが混じっても、扱いはこれまでと同じです。読めなかったものはエラーとして知らせ、読めたものだけを配列に入れ、最後に終了コードで失敗を伝えます。

```sh
$ cargo run -- --json sample/hello.txt nope.txt sample/japanese.txt
エラー: nope.txt: No such file or directory (os error 2)
[
  {"file": "sample/hello.txt", "lines": 3, "chars": 16, "bytes": 16},
  {"file": "sample/japanese.txt", "lines": 2, "chars": 9, "bytes": 23}
]
```

エラーの知らせは、これまでどおり標準エラー出力に出ます。JSON 本体は標準出力に出るので、`rwc --json ... > result.json` のようにファイルへ保存しても、エラー行が JSON に混ざることはありません。受け取ったプログラムは、きれいな JSON だけを読めます。

これで、出力を整える三つの手を入れ終えました。合計で全体を見渡せるようにし、端末では色で読みやすく、別のプログラムには JSON で。同じ結果を、受け取る相手に合わせて出し分けられるようになりました。
