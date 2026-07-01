# perm.rs を読む

前のページで、`main.rs` が `perm::format_mode(mode)` を呼んで 10 文字を作っていることを見ました。その `format_mode` があるのが `perm.rs` です。このページで読みます。

`perm.rs` は、末尾のテストを除くとこうなっています。

```rust
// OS がパスごとに持つパーミッションの整数 (mode) を、
// ls -l の左端と同じ 10 文字の文字列に変換する。

pub fn format_mode(mode: u32) -> String {
    let mut s = String::new();
    s.push(file_type(mode));
    s.push_str(&rwx((mode >> 6) & 0b111)); // 所有者
    s.push_str(&rwx((mode >> 3) & 0b111)); // グループ
    s.push_str(&rwx(mode & 0b111)); // その他
    s
}

// 先頭 1 文字の種別を返す。
fn file_type(_mode: u32) -> char {
    '-'
}

// 3 ビットを rwx の 3 文字に変換する。
fn rwx(bits: u32) -> String {
    let r = if bits & 0b100 != 0 { 'r' } else { '-' };
    let w = if bits & 0b010 != 0 { 'w' } else { '-' };
    let x = if bits & 0b001 != 0 { 'x' } else { '-' };
    [r, w, x].iter().collect()
}
```

関数は 3 つです。入り口が `format_mode` で、その中から `file_type` と `rwx` を呼んでいます。

## format_mode

```rust
pub fn format_mode(mode: u32) -> String {
    let mut s = String::new();
    s.push(file_type(mode));
    s.push_str(&rwx((mode >> 6) & 0b111)); // 所有者
    s.push_str(&rwx((mode >> 3) & 0b111)); // グループ
    s.push_str(&rwx(mode & 0b111)); // その他
    s
}
```

`format_mode` は、まず空の文字列 `s` を用意し、そこへ文字を足して 10 文字を組み立てます。先頭の 1 文字を `file_type` で、続く 9 文字を `rwx` で作ります。

## 先頭の 1 文字を足す

```rust
s.push(file_type(mode));
```

`file_type(mode)` が種別の 1 文字（`char`）を返し、それを `s.push` で `s` の末尾に足します。`push` は 1 文字を足すメソッドです。

## 続く 9 文字を足す

所有者・グループ・その他を 3 文字ずつ足します。所有者の行はこうです。

```rust
s.push_str(&rwx((mode >> 6) & 0b111)); // 所有者
```

内側から見ていきます。`(mode >> 6) & 0b111` は、`mode` から所有者の 3 ビットを取り出す式です。`>> 6` で所有者のビットを下位に下ろし、`& 0b111` で下位 3 ビットだけを残します。この取り出し方は「ビットとマスクの基本」で読んだとおりです。取り出した 3 ビットを `rwx(...)` に渡すと、`rwx` の 3 文字（`String`）が返ります。それを `s.push_str` で `s` の末尾に足します。`&rwx(...)` の `&` は、返ってきた文字列を参照で渡すための記号です。「Rust の基本構文」で見た `&args[1]` と同じ、コピーを作らず中身を見るための `&` です。

グループとその他も同じで、シフト量が `>> 3`・シフトなしと変わるだけです。こうして先頭 1 文字と後ろ 9 文字で、`-rwxr-xr-x` の 10 文字ができあがります。

## rwx 関数

`rwx` 関数は、渡された 3 ビットを `rwx` の 3 文字に直します。

```rust
fn rwx(bits: u32) -> String {
    let r = if bits & 0b100 != 0 { 'r' } else { '-' };
    let w = if bits & 0b010 != 0 { 'w' } else { '-' };
    let x = if bits & 0b001 != 0 { 'x' } else { '-' };
    [r, w, x].iter().collect()
}
```

読み・書き・実行を 1 ビットずつ調べます。`bits & 0b100` は 3 ビットのうち一番上（読み）だけを取り出す式で、0 でなければ読み権限あり。あれば `'r'`、なければ `'-'` を `r` に入れます。書き（`0b010`）と実行（`0b001`）も同じ要領で `w`・`x` を決めます。このビットの調べ方は「ビットとマスクの基本」で読んだとおりです。

最後の `[r, w, x].iter().collect()` は、決まった 3 つの文字を 1 つの文字列（`String`）にまとめて返します。所有者が全部ありなら `rwx`、その他が読みと実行だけなら `r-x`、といった 3 文字になります。

残るは、先頭の種別を作る `file_type` です。

## file_type

```rust
fn file_type(_mode: u32) -> char {
    '-'
}
```

`file_type` は先頭の種別 1 文字を返します。引数が `_mode` とアンダースコアで始まっているのは、受け取るけれど使っていないという印です。実際、中では `mode` を見ずに、いつも `'-'` を返しています。

通常ファイルの種別は `-`、ディレクトリは `d` です。`file_type` はこの違いを見ていないので、どんなパスでも先頭は `-` になります。1 ページ目で `sample/script.sh` が `-rwxr-xr-x` と正しく見えたのは、通常ファイルの種別がたまたま `-` だったからです。

次のページでは、`mode` から種別を見分けて `file_type` を書き直します。
