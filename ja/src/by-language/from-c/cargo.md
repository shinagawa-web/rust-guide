# Makefile の代わりに Cargo

C言語 でプロジェクトをビルドするとき、`Makefile` を書いてコンパイルの手順を管理し、外部ライブラリは自分でインストールしてリンクフラグを渡してきました。Rust では `Cargo` がそれをまとめて担います。この章では、C のビルドと Cargo を並べて、何が変わるかを見ます。

## C のビルド — Makefile とヘッダとリンク

C の小さなプロジェクトはコンパイラを直接呼べばすみますが、ファイルが増えてくると `Makefile` で管理します。

```makefile
# Makefile
CC = gcc
CFLAGS = -Wall -O2

main: main.o utils.o
	$(CC) -o main main.o utils.o

main.o: main.c utils.h
	$(CC) $(CFLAGS) -c main.c

utils.o: utils.c utils.h
	$(CC) $(CFLAGS) -c utils.c
```

外部ライブラリを使うときは、パッケージマネージャ（`apt`、`brew` など）で入れてから、Makefile にリンクフラグを書きます。

```makefile
# JSON ライブラリを使う例
LDFLAGS = -ljson-c

main: main.o
	$(CC) -o main main.o $(LDFLAGS)
```

ライブラリのバージョン管理や、開発環境と本番環境でのバージョンのずれはプログラマが管理します。

## Cargo — 外部ライブラリの取得からビルドまで一本

Rust のプロジェクトは `cargo new` で作ります。

```sh
$ cargo new hello
$ cd hello
```

生成された `Cargo.toml` にプロジェクトの情報と使う外部ライブラリを書きます。

```toml
[package]
name = "hello"
version = "0.1.0"
edition = "2021"

[dependencies]
serde = "1"
```

`cargo build` を実行すると、`crates.io` から `serde` を自動的にダウンロードしてビルドします。バージョンは `Cargo.lock` に記録され、チームで同じバージョンを使えます。

```sh
$ cargo build    # ビルド
$ cargo run      # ビルドして実行
$ cargo test     # テストを実行
```

C で `Makefile` に書いていたコンパイル手順、`apt` や `brew` でやっていたライブラリの取得、リンクフラグの指定が、`Cargo.toml` への一行と `cargo build` に置き換わります。

---

C のビルドは `Makefile`・ヘッダ・リンクフラグをそれぞれ手で管理していました。Cargo はプロジェクトの作成から外部ライブラリの取得・ビルド・テストまでを一つのツールで担います。
