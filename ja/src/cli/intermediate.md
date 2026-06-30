# 中級

初級では、できあがった rwc を読んでバグを一つ直しました。中級では、その rwc に自分で機能を実装していきます。コードを読むだけの立場から、機能を足し、人に渡せる形にするまでが目標です。

完璧に仕上げてから世に出すのではなく、動いたら配り、使いながら直していく、という進め方で進みます。

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

## 実装していく順番

1. [複数ファイルとオプションに対応する](intermediate/multi-files-and-options.md)
