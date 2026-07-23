# WebAssembly

Rust で書いたコードがブラウザの中で動く。JavaScript ではなく Rust のコードが、ページを開いた瞬間に実行される。WebAssembly はその仕組みです。

速度が求められる処理を JavaScript の外に出したい、Cloudflare Workers のようなエッジで動かしたい——そういった場面で Rust と WebAssembly の組み合わせが使われています。このガイドでは、ブラウザで動く小さな diff ツールを起点に、最終的には自分でデプロイしたエッジの API まで持っていきます。

## ガイド

- [初級](beginner.md) — ブラウザで動く diff ツールのバグを修正する。全 8 ページ・約 3 時間
- [中級](intermediate.md) — diff ツールを Cloudflare Workers のエッジ API として公開する。全 7 ページ・約 3 時間
