# 補足：CI でクロスプラットフォーム配布

配布の章でビルドした実行ファイルは、ビルドした環境と同じ OS・CPU アーキテクチャでしか動きません。macOS（Apple Silicon）でビルドしたものは macOS（Apple Silicon）向け、Linux（x86_64）でビルドしたものは Linux（x86_64）向けだけです。

複数の環境向けをまとめて用意するには、それぞれの環境でビルドしなければなりません。GitHub Actions を使えば、Linux・macOS・Windows の実行ファイルを一度のタグ push でまとめてビルドして Release に添付できます。

## ワークフローファイルを作る

リポジトリに `.github/workflows/release.yml` を作ります。

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        include:
          - os: ubuntu-latest
            target: x86_64-unknown-linux-gnu
            artifact: rwc
          - os: macos-latest
            target: aarch64-apple-darwin
            artifact: rwc
          - os: windows-latest
            target: x86_64-pc-windows-msvc
            artifact: rwc.exe

    steps:
      - uses: actions/checkout@v4
      - name: Add target
        run: rustup target add ${{ matrix.target }}
      - name: Build
        run: cargo build --release --target ${{ matrix.target }}
      - name: Upload to release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: gh release upload ${{ github.ref_name }} target/${{ matrix.target }}/release/${{ matrix.artifact }}
```

`strategy.matrix` に3つの組み合わせを定義しています。GitHub Actions はこの数だけジョブを並列で起動します。`runs-on: ${{ matrix.os }}` は各ジョブの実行環境で、`matrix.os` にその行の値（`ubuntu-latest` など）が入ります。`matrix.target` や `matrix.artifact` も同じ仕組みで各ステップに展開されます。

各 `target` は Rust のビルドターゲット名で、OS と CPU の組み合わせを表しています。

| target | 意味 |
|--------|------|
| `x86_64-unknown-linux-gnu` | Linux（x86_64） |
| `aarch64-apple-darwin` | macOS（Apple Silicon） |
| `x86_64-pc-windows-msvc` | Windows（x86_64） |

`rustup target add` は、そのターゲット向けのコンパイラツールチェーンを追加するコマンドです。Rust はデフォルトでは実行環境向けのターゲットしか入っていないため、`cargo build --target` で指定するターゲットを事前に追加しておく必要があります。

`GITHUB_TOKEN` はリポジトリに自動的に用意されているトークンで、設定は不要です。`gh release upload` がこのトークンを使って Release にファイルを添付します。`${{ github.ref_name }}` には push されたタグ名（例：`v0.2.0`）が入ります。

## リリースを作って push する

`gh release create` でタグを作りながらリリースを公開します。実行ファイルをここで添付する必要はありません。CI が後からアップロードします。

```sh
$ gh release create v0.2.0 --title "v0.2.0"
```

このコマンドで `v0.2.0` タグが push され、ワークフローが起動します。3つのジョブが並列に走り、それぞれのビルドが終わるとリリースページに実行ファイルが追加されます。

受け取る人は自分の環境に合ったファイルをダウンロードして使えます。
