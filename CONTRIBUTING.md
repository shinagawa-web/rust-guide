# コントリビュート

誤字・誤訳の修正、概念説明の改善、新しい言語別ガイドの追加（`by-language/from-xxx/`）など、PR を歓迎します。

## 構成

コンテンツ本体は `concepts/` に共通の部品として置き、`by-motivation/`・`by-level/`・`by-language/` 配下の各入口から `{{#include}}` で composition しています。`concepts/` のファイルを編集すると、それを include しているすべての入口に反映されます。新しいページを追加する場合は `SUMMARY.md` への追記も忘れずに。

```
ja/                  # 日本語版
en/                  # 英語版（ja/ と同じ構造）
└── src/
    ├── SUMMARY.md
    ├── intro/
    ├── by-motivation/  # きっかけ別
    ├── by-level/       # レベル別
    ├── by-language/    # 言語別
    └── concepts/       # コンテンツ本体（部品）
```

コード例には極力 [Rust Playground](https://play.rust-lang.org/) へのリンクを付けています。

未実装のページは冒頭に工事中バナーを入れています：

```markdown
> 🚧 **このページは現在準備中です。**
```

## 必要環境

```bash
# Rust（rustup 経由でのインストール推奨）
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# mdbook
cargo install mdbook
mdbook --version
```

**動作確認バージョン（ローカル）:** Rust 1.95.0 / mdbook 0.5.3
CI では mdbook 0.4.40 をピン留めしてビルドのみ実行しています（Rust ツールチェーンは未使用）。

## ローカルでの動かし方

```bash
git clone https://github.com/shinagawa-web/rust-guide.git
cd rust-guide

mdbook serve ja --open   # 日本語版 → http://localhost:3000
mdbook serve en --open   # 英語版   → http://localhost:3001
```

ビルド（静的 HTML 生成）:

```bash
mdbook build ja   # → book/ja/ に出力
mdbook build en   # → book/en/ に出力
```
