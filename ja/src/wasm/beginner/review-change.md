# 変更をふり返る

日本語でも正しく差分が取れるようになり、テストもそれを確かめるようになりました。ここまでで自分が手を入れたのは `src/lib.rs` の1ファイルだけです。最後に、自分が何をどう変えたのかを見返し、自分の言葉でまとめます。変更を自分の言葉で言えるようになることが、この初級編のねらいです。

## 変更を見返す

まず、自分の変更を `git diff` で見返します。`git diff` は、いま手元で変えた内容を、変えた行だけ並べて見せてくれます。

```sh
$ git diff
```

```diff
--- a/src/lib.rs
+++ b/src/lib.rs
@@ -2,7 +2,9 @@ use wasm_bindgen::prelude::*;
 
 #[wasm_bindgen]
 pub fn diff(a: &str, b: &str) -> String {
-    let ops = build_diff(a.as_bytes(), b.as_bytes());
+    let a: Vec<char> = a.chars().collect();
+    let b: Vec<char> = b.chars().collect();
+    let ops = build_diff(&a, &b);
     render(&ops)
 }
 
@@ -15,10 +17,10 @@ enum Kind {
 
 struct Op {
     kind: Kind,
-    byte: u8,
+    ch: char,
 }
 
-fn build_diff(a: &[u8], b: &[u8]) -> Vec<Op> {
+fn build_diff(a: &[char], b: &[char]) -> Vec<Op> {
     let n = a.len();
     let m = b.len();
     let w = m + 1;
@@ -38,23 +40,23 @@ fn build_diff(a: &[u8], b: &[u8]) -> Vec<Op> {
     let (mut i, mut j) = (0, 0);
     while i < n && j < m {
         if a[i] == b[j] {
-            ops.push(Op { kind: Kind::Eq, byte: a[i] });
+            ops.push(Op { kind: Kind::Eq, ch: a[i] });
             i += 1;
             j += 1;
         } else if dp[(i + 1) * w + j] >= dp[i * w + (j + 1)] {
-            ops.push(Op { kind: Kind::Del, byte: a[i] });
+            ops.push(Op { kind: Kind::Del, ch: a[i] });
             i += 1;
         } else {
-            ops.push(Op { kind: Kind::Add, byte: b[j] });
+            ops.push(Op { kind: Kind::Add, ch: b[j] });
             j += 1;
         }
     }
     while i < n {
-        ops.push(Op { kind: Kind::Del, byte: a[i] });
+        ops.push(Op { kind: Kind::Del, ch: a[i] });
         i += 1;
     }
     while j < m {
-        ops.push(Op { kind: Kind::Add, byte: b[j] });
+        ops.push(Op { kind: Kind::Add, ch: b[j] });
         j += 1;
     }
     ops
@@ -65,12 +67,11 @@ fn render(ops: &[Op]) -> String {
     let mut i = 0;
     while i < ops.len() {
         let kind = &ops[i].kind;
-        let mut bytes = Vec::new();
+        let mut text = String::new();
         while i < ops.len() && &ops[i].kind == kind {
-            bytes.push(ops[i].byte);
+            text.push(ops[i].ch);
             i += 1;
         }
-        let text = String::from_utf8_lossy(&bytes);
         match kind {
             Kind::Eq => out.push_str(&text),
             Kind::Del => {
@@ -111,4 +112,9 @@ mod tests {
     fn pure_deletion() {
         assert_eq!(diff("abc", "ac"), "a[-b-]c");
     }
+
+    #[test]
+    fn diffs_japanese() {
+        assert_eq!(diff("吾輩は猫である。", "吾輩は犬である。"), "吾輩は[-猫-][+犬+]である。");
+    }
 }
```

`-` で始まる行が消したもの、`+` で始まる行が足したものです。変更は `src/lib.rs` の中に散らばって見えますが、やったことは大きく2つです。1つは、`diff` から `render` までを、バイト（`u8` や `as_bytes`）ではなく文字（`char` や `chars`）で扱うように変えたこと。もう1つは、末尾に日本語のテストを1つ足したことです。`build_diff` の中で同じ `byte` から `ch` への書き換えが何度も出てくるのは、`Op` を作っている箇所がいくつもあるためです。

## 何をどう変えたか、文章にする

diff を見ながら、変更を自分の言葉で説明してみます。次の4つが書ければ十分です。

- 直したもの: 日本語を入れると、差分が `吾輩は�[-��-][+��+]である。` のように崩れていた。
- 原因: 文字列をバイトの並びとして比べていたため、日本語のように1文字が複数バイトになる文字が、途中で区切られていた。
- 直し方: `diff` の入口で `chars()` を使って文字の並びにし、`Op` が持つ中身も、`build_diff` が受け取る型も、バイト（`u8`）から文字（`char`）に変えた。`render` は文字をそのままつなぐようにして、`from_utf8_lossy` をやめた。
- 確認: 既存のテストは通ったまま、日本語のテストを足して、あとでバイト単位に戻っても気づけるようにした。

コードは読めば追えますが、「なぜその変更で直るのか」を言葉にできるかどうかは別の力です。文字列をバイトで見るか文字で見るかで結果が変わる、というところまで押さえられていれば、この修正は自分のものになっています。

## ふり返り

ここまでで、Rust で書いた `diff` がブラウザの JavaScript から呼ばれるしくみ（境界）を読み、`src/lib.rs` が差分をどう組み立てているかを読み、バイト単位を文字単位に直し、テストで確かめ、変更を自分の言葉でまとめました。

作ったのは小さな差分ツールですが、Rust の関数がブラウザの中で動いて JavaScript から呼ばれること、その境界では文字列にひと手間が要ること、そして同じ文字列でも、バイトとして扱うか文字として扱うかで結果が変わることを、手を動かして確かめてきました。既存のコードを読んで、必要なところだけ直せる——この進め方は、題材が差分ツールでなくなっても同じように使えます。

Rust を wasm にしてブラウザで動かすと、差分の計算のように計算量の多い処理では、JavaScript より速く動きます。どれだけ速いのかは、作ったツールで自分で計れます。興味があれば、最後の補足ページで wasm と JavaScript の速さを比べてみてください。
