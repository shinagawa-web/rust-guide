# 中級

OS は、ファイルごとにサイズ・更新日時・所有者・リンク数などのメタデータを持っています。これを Rust で読み出せるようになると、ファイルを扱うツールを書く土台ができます。`ls -al` はその土台の上に立つ典型例として、この中級の題材にしています。

初級では fmode のコードを読んで表示の誤りを直しました。中級では fmode を起点にして列を一つずつ足し、`ls -al` と同じ出力を出せるところまで進みます。最終的には手元にインストールして配布できる状態にします。

このガイドは Linux を前提にします。macOS でもおおむね動きますが、出力例は Linux に合わせています。

## 出発点のリポジトリを用意する

中級では、初級を終えた状態の fmode を出発点にします。専用のリポジトリを用意したので、これを clone して進めます。初級のリポジトリとは別なので、混ざる心配はありません。

```sh
$ git clone https://github.com/shinagawa-web/rust-guide-sample-intermediate-low-level.git
$ cd rust-guide-sample-intermediate-low-level
```

手元で動くことを確かめておきます。

```sh
$ cargo run
```

```text
-rw-r--r--  Cargo.toml
-rw-r--r--  README.md
drwxr-xr-x  src
```

この出力が出れば、出発点の準備ができています。

## ゴール

中級を終えると、fmode はこう動きます。

```sh
$ fmode
```

```text
-rw-r--r-- 1 user user   284 Jul 10 09:12 Cargo.toml
-rw-r--r-- 1 user user   512 Jul 10 09:12 README.md
drwxr-xr-x 2 user user  4096 Jul 10 09:12 src
```

左から順に permissions・nlink・owner・group・size・date・name で、`ls -al` と同じ列構成になります。

## 進め方

次の順で進めます。

1. [作ったツールを人に渡す](intermediate/distribute.md)
2. [ファイルのメタデータを読む](intermediate/raw-data.md)
3. [サイズと更新日時を表示する](intermediate/size-date.md)
4. [所有者とグループを名前で出す](intermediate/owner-group.md)
5. [`ls -al` を組み上げる](intermediate/ls-al.md)
