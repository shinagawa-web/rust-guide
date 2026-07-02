# 中級

初級では、rwc というツールを題材にしました。ファイルの行数・文字数・バイト数を数える、小さな CLI です。そのできあがったコードを読み解いて、一か所に手を入れました。他人が書いたコードを追い、直せることを確かめる回でした。

中級で目指すのは、コードを読んで直せる段階から一歩進んで、自分で機能を足し、実用的なツールに仕上げて人に渡せるようになることです。

たとえば、こんな機能です。

- オプション（フラグ）で動きを変える
- 複数のファイルやディレクトリをまとめて扱う
- 読めない入力を渡されても落ちないようにする
- 端末では色を付けて見やすくする
- 結果を JSON で出して別のプログラムにつなぐ

CLI ツールでよく欲しくなるこうした機能を、rwc という一つの道具に一つずつ足しながら、手を動かして身につけていきます。

進め方は「動いたら配る」です。完璧に仕上げてから世に出すのではなく、動いた時点でいったん配り、使いながら直していく。実際の小さなツールづくりは、たいていこの順で進みます。

## 出発点のリポジトリを用意する

中級では、初級を終えた状態の rwc を出発点にします。専用のリポジトリを用意したので、これを clone して進めます。初級で手を入れたコードとは別なので、混ざる心配はありません。

この先は Rust と cargo が入っている前提で進めます。まだ整えていない場合は、初級の [プロジェクトを動かす](beginner/cargo.md) で環境を用意してください。

```sh
$ git clone https://github.com/shinagawa-web/rust-guide-sample-intermediate-cli.git
$ cd rust-guide-sample-intermediate-cli
```

手元で動くことを確かめておきます。

```sh
$ cargo run -- sample/hello.txt
```

```text
lines: 3  chars: 16  bytes: 16
```

この出力が出れば、出発点の準備ができています。ここから機能を足していきます。

## ゴール

中級を終えると、rwc はこう動きます。

複数のファイルをまとめて数え、最後に合計も出します。

```sh
$ rwc sample/hello.txt sample/japanese.txt
sample/hello.txt  lines: 3  chars: 16  bytes: 16
sample/japanese.txt  lines: 2  chars: 9  bytes: 23
total  lines: 5  chars: 25  bytes: 39
```

ファイルを一つずつ並べる代わりに、ディレクトリを渡すこともできます。その中にあるファイルをまとめて数えます。

```sh
$ rwc sample/
sample/hello.txt  lines: 3  chars: 16  bytes: 16
sample/japanese.txt  lines: 2  chars: 9  bytes: 23
total  lines: 5  chars: 25  bytes: 39
```

欲しい項目だけを選べます。行数だけ表示すれば、合計も行数だけになります。

```sh
$ rwc --lines sample/hello.txt sample/japanese.txt
sample/hello.txt  lines: 3
sample/japanese.txt  lines: 2
total  lines: 5
```

読めないファイルが混じっても、そこで止まりません。読めなかったものだけ知らせて、残りは数え続けます。

```sh
$ rwc sample/hello.txt nope.txt sample/japanese.txt
sample/hello.txt  lines: 3  chars: 16  bytes: 16
エラー: nope.txt: No such file or directory (os error 2)
sample/japanese.txt  lines: 2  chars: 9  bytes: 23
total  lines: 5  chars: 25  bytes: 39
```

端末で眺めるときは、ファイル名と数字を色分けして、結果を読みやすくします。数が多くなるほど、どこがファイル名でどこが数字か、目で追いやすくなります。

<pre style="background:#1c1c1c;color:#d0d0d0;padding:1rem;border-radius:6px;overflow:auto;line-height:1.5"><span style="color:#8a8a8a">$ rwc sample/hello.txt sample/japanese.txt</span>
<span style="color:#4fb3ff">sample/hello.txt</span>  lines: <span style="color:#c7e17b">3</span>  chars: <span style="color:#c7e17b">16</span>  bytes: <span style="color:#c7e17b">16</span>
<span style="color:#4fb3ff">sample/japanese.txt</span>  lines: <span style="color:#c7e17b">2</span>  chars: <span style="color:#c7e17b">9</span>  bytes: <span style="color:#c7e17b">23</span>
<span style="color:#8a8a8a">total</span>  lines: <span style="color:#c7e17b">5</span>  chars: <span style="color:#c7e17b">25</span>  bytes: <span style="color:#c7e17b">39</span></pre>

一方、結果は目で読むだけでなく、別のプログラムに渡したいこともあります。`--json` を付けると、機械が扱いやすい JSON で出せます。

```sh
$ rwc --json sample/hello.txt sample/japanese.txt
[
  {"file": "sample/hello.txt", "lines": 3, "chars": 16, "bytes": 16},
  {"file": "sample/japanese.txt", "lines": 2, "chars": 9, "bytes": 23}
]
```

こちらは、目で眺めるより別のプログラムに渡すのに向いた形です。たとえば別のコマンドにパイプで渡して必要な値だけ取り出したり、スクリプトの入力にして「行数がしきい値を超えていないか」を自動で確かめたり、別のプログラムから rwc を呼んで結果を取り込んだり、といった使い方ができます。色や体裁を挟まないぶん、プログラムからは扱いやすくなります。

呼び出し方も変わります。`cargo run --` ではなく、自分のマシンに入れた `rwc` の一言で、どこからでも動かせます。動いた時点でいったん人にも配り、そこから使いながら育てていきます。

## 実装していく順番

次の順で、rwc を一段ずつ育てていきます。

1. [複数のファイルとディレクトリを受け取る](intermediate/multi-files.md)
2. [オプションで表示を選ぶ](intermediate/options.md)
3. [ツールを配布する](intermediate/distribute.md)
4. エラーで落とさないようにする
5. 壊さず改善できるようにする
6. 出力を整える

4 以降は順次公開します。
