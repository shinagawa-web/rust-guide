# rust-guide

> **Why-first なRust学習ガイド**
> Rustの「なぜそうなっているのか」を起点に学べるドキュメントサイト

**🌐 サイト:** https://shinagawa-web.github.io/rust-guide/ja/ （日本語） / https://shinagawa-web.github.io/rust-guide/en/ （English）

---

## なぜこのガイドを作ったか

Rustを学ぼうとしたとき、既存のドキュメントにいくつかの大きな問題を感じました。

**1. 「なぜ」より先に「どうやって」が来る**
構文や使い方の説明は丁寧なのに、「なぜこの仕組みが言語に存在するのか」の説明が薄い。ライフタイムアノテーションの書き方を覚える前に、borrowチェッカーが何を防ごうとしているかを理解しないと、記号が呪文にしか見えない。

**2. 全員を同じ順序で学ばせようとしている**
CLIツールを作りたい人も、WebAssemblyをやりたい人も、低レイヤーに興味がある人も、全員が同じ章を同じ順序で読む構成になっている。目的によって「最初に学ぶべき概念」は違うはずなのに、ロードマップが一本道。

**3. どこまで学べばいいかが分からない**
Rustは概念が多い。所有権、ライフタイム、トレイト、スマートポインタ、unsafe……。「自分の目的にはどこまで必要か」の判断材料がなく、全部やらないといけない気になる。

**4. 他言語経験者が詰まるポイントがカバーされていない**
GoやPythonを書いてきた人がRustで最初に混乱するのは、既存の概念との差分の部分。「Goのinterfaceとトレイトは似てるけど何が違うのか」「Pythonのリストと`Vec`はどう違うのか」という視点からの説明がほぼない。

**5. 日本語版の翻訳品質の問題**
公式の日本語訳は直訳調が強く、英語の構文をそのまま日本語にしているため読みにくい箇所が多い。概念の難しさに翻訳の読みにくさが重なって、理解の障壁が上がっている。

**6. レベル感が無視されている**
プログラミング経験のある人を想定しているとはいえ、難解な概念が突然現れる。ライフタイムのような概念は、一度に全部やるより段階的に触れていく方が確実に定着する。

---

このガイドはこれらの問題を解消するために、以下の3つの軸でコンテンツを整理しました。自分のバックグラウンドや目的に合った入口からRustを学べることを目指しています。

### 3つの入口

| 軸 | 説明 |
|---|---|
| **きっかけ別** | CLIツールを作りたい、Webバックエンド、低レイヤー開発など、目的からロードマップを案内 |
| **レベル別** | 初級・中級・上級でコンテンツを段階分け。ライフタイムなど難解な概念は複数ステージに分割 |
| **言語別** | Go、Python、TypeScript、C++、Javaなど、使ってきた言語との差分ベースで説明 |

コンテンツ本体（`concepts/`）は共通の部品として管理し、各入口からincludeする構成になっています。

### Rust Playgroundについて

コード例には極力 [Rust Playground](https://play.rust-lang.org/) へのリンクを付けています。ローカル環境なしでそのまま動かして確認できます。

---

## 必要環境

### ローカルでビルドする場合

```bash
# Rust（rustup経由でインストール推奨）
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# mdbook
cargo install mdbook

# バージョン確認
mdbook --version
```

**動作確認バージョン（ローカル）:**
- Rust: 1.95.0
- mdbook: 0.5.3

CI では mdbook 0.4.40 をピン留めしてビルドのみ実行しています（Rust ツールチェーンは使用していません）。

---

## ローカルでの動かし方

```bash
git clone https://github.com/shinagawa-web/rust-guide.git
cd rust-guide

# 日本語版
mdbook serve ja --open
# → http://localhost:3000 で確認

# 英語版
mdbook serve en --open
# → http://localhost:3001 で確認
```

ビルド（静的HTML生成）:

```bash
mdbook build ja   # → book/ja/ に出力
mdbook build en   # → book/en/ に出力
```

---

## ディレクトリ構造

```
rust-guide/
├── ja/                          # 日本語版
│   ├── book.toml
│   └── src/
│       ├── SUMMARY.md
│       ├── intro/
│       ├── by-motivation/       # きっかけ別
│       ├── by-level/            # レベル別
│       │   ├── beginner/
│       │   ├── intermediate/
│       │   └── advanced/
│       ├── by-language/         # 言語別
│       │   ├── from-go/
│       │   ├── from-python/
│       │   ├── from-cpp/
│       │   ├── from-typescript/
│       │   └── from-java/
│       └── concepts/            # コンテンツ本体（部品）
│           ├── ownership/
│           ├── lifetime/
│           ├── error-handling/
│           ├── traits/
│           ├── closures/
│           ├── collections/
│           ├── smart-pointers/
│           ├── concurrency/
│           └── generics/
│
├── en/                          # 英語版（日本語版から翻訳）
│   ├── book.toml
│   └── src/
│       └── ...                  # ja/ と同じ構造
│
└── book/                        # ビルド出力（git管理外）
    ├── ja/
    └── en/
```

`by-motivation/`、`by-level/`、`by-language/` 配下のファイルは `concepts/` の内容を `{{#include}}` でcompositionする構成です。

---

## 工事中ページについて

未実装のページは冒頭に以下のバナーを入れています：

```markdown
> 🚧 **このページは現在準備中です。**
```

コンテンツの追加・修正のPRは歓迎します。

---

## コントリビュート

- 誤字・誤訳の修正
- 概念説明の改善
- 新しい言語別ガイドの追加（`by-language/from-xxx/`）
- 英語版への翻訳

`concepts/` 配下の部品ファイルを編集すると、それをincludeしているすべての入口に反映されます。新しいページを追加する場合は `SUMMARY.md` への追記も忘れずに。

---

## ライセンス

MIT
