# ボードを光らせるまで

このページで、Rust で書いたプログラムを初めて micro:bit に書き込みます。ツールをそろえて最初の1回を通すところが、いちばんつまずきやすい山場です。逆に、ここさえ越えれば、以降のページは書き込んで確かめるの繰り返しになります。

終えると、ボードの LED が自分のコードで動きます。ハートが1秒ごとに点滅する、これがこのページのゴールです。

![micro:bit v2 の 5×5 LED で、ハートが1秒ごとに点滅している様子](https://i.gyazo.com/693a031f5873def7a749e90d4de62e7e.gif)

まず、パソコン側の道具をそろえます。パソコンで動くプログラムは、書いてそのままパソコンで実行できます。組み込みでは、書いた Rust を micro:bit のマイコン向けにコンパイルし、USB 経由でボードに送り込む、というひと手間が要ります。まず Rust 本体を入れ、それから組み込み用の道具を足していきます。

## Rust を入れる

Rust のインストールには rustup を使います。rustup は Rust のインストーラーで、コンパイラ本体と、ビルドツールの cargo が一緒に入ります。すでに Rust を使っているなら、この節は飛ばせます。

### Mac・Linux

ターミナルで次のコマンドを実行します。

```sh
$ curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

途中で選択肢が出たらそのまま Enter を押して進めます。終わったらターミナルを再起動するか、`source "$HOME/.cargo/env"` を実行すると今のシェルに反映されます。

### Windows

公式サイトからインストーラーをダウンロードして実行します。

[rustup.rs](https://rustup.rs)

### 入ったか確認する

```sh
$ rustc --version
```

バージョン番号が表示されれば成功です。

## target と書き込みツールを入れる

ここから2つ、最初に一度だけ用意します。どちらも一度入れれば、以降のページでは使い回します。

1つ目は、micro:bit のマイコン向けにコンパイルするための target です。`cargo build` は、何も指定しなければ、いま使っているパソコンの CPU 向けの機械語を作ります。micro:bit の CPU はそれとは別の種類（ARM Cortex-M）なので、それでは動きません。その CPU 向けに翻訳できるよう、コンパイラに target を1つ足します。

```sh
$ rustup target add thumbv7em-none-eabihf
```

`thumbv7em-none-eabihf` は micro:bit のマイコンの CPU の種類を表す名前です。覚える必要はありません。真ん中の `none` は「OS が無い」という意味で、OS の無いマイコンに向けてコンパイルする、という話がこの名前にそのまま出ています。

2つ目は、できあがったプログラムを USB 経由でボードに書き込むツールです。その役目を担うのが probe-rs で、`cargo embed` というコマンドを提供します。

```sh
$ cargo install probe-rs-tools --locked
```

ビルドが走るので数分かかります。入れるのは `probe-rs-tools` という名前のパッケージで、これで `cargo embed` が使えるようになります。

## プロジェクトを用意する

このページで書き込むサンプルを、手元に持ってきます。

```sh
$ git clone https://github.com/shinagawa-web/rust-guide-sample-beginner-embedded
$ cd rust-guide-sample-beginner-embedded
```

これ以降のコマンドは、このフォルダの中で実行します。

## ボードをつないで認識を確かめる

micro:bit には、パソコンとやりとりするための小さなデバッガの回路が最初から載っています。USB でつなぐとこの回路がパソコンから見えるようになり、probe-rs はここを通してボードに書き込みます。書き込み用の機材を別に用意しなくていいのは、この回路のおかげです。

USB でつないだら、認識されているか確かめます。

```sh
$ probe-rs list
```

つながっていれば、micro:bit が1台見つかります。

```text
The following debug probes were found:
[0]: BBC micro:bit CMSIS-DAP -- 0d28:0204 (CMSIS-DAP)
```

何も出ないときは、まだ認識されていません。多いのは USB の差し込みが浅いこと、もう一つは充電専用（データの通らない）ケーブルを使っていることです。挿し直す、あるいはデータの通るケーブルに替えると見えるようになります。

## 書き込んで点滅させる

プロジェクトのフォルダで、次を実行します。

```sh
$ cargo embed
```

これ1つで、コンパイルからボードへの書き込みまでまとめて走ります。

```text
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.02s
      Erasing ✔ 100% [####################]  24.00 KiB @  32.31 KiB/s (took 1s)
  Programming ✔ 100% [####################]  24.00 KiB @  20.05 KiB/s (took 1s)
     Finished in 1.94s
        Done processing config profile default
```

`Erasing`（ボードの古い中身を消す）と `Programming`（新しいプログラムを書き込む）が 100% になり、`Finished` が出れば成功です。プロンプトに戻った時点で、ページ冒頭の映像のように、ボードのハートが1秒ごとに点滅を始めています。自分の書いた Rust が、目の前のハードウェアを動かした瞬間です。

## うまくいかないとき（OS 別）

`probe-rs list` にボードが出ない、あるいは `cargo embed` が書き込みまで進まないときは、多くが OS ごとのプローブへのアクセスの問題です。まず、前の節のとおり USB の差し込みとケーブル（データの通るもの）を確かめてください。それでも解決しないときは、OS ごとに次を見ます。

### Linux

Linux では、ふつうのユーザーのままだとプローブにアクセスできず、つないでも `probe-rs list` に出ないことがあります。probe-rs が配っている udev ルールを入れると、root でなくてもアクセスできるようになります。

```sh
$ sudo curl -fsSL https://probe.rs/files/69-probe-rs.rules -o /etc/udev/rules.d/69-probe-rs.rules
$ sudo udevadm control --reload
$ sudo udevadm trigger
```

入れたら、ボードを挿し直します。

### macOS

ドライバは要りません。認識されないときは、前の節のとおり USB の差し込みが浅いか、ケーブルがデータの通らないものであることがほとんどです。

### Windows

ドライバは要りません。micro:bit のデバッガ（CMSIS-DAP）はそのまま使えます。認識されないときは、USB の差し込みとケーブルを確かめてください。
