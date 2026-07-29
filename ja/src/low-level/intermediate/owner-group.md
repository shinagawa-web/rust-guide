# 所有者とグループを名前で表示する

前章で size と mtime を整えました。残っているのは uid と gid です。

```text
-rw-r--r-- 1 1000 1000    284 Jul 10 17:05 Cargo.toml
```

`ls -al` はこの数字を `root`、`user` のような名前で出します。Linux は uid と名前の対応を `/etc/passwd` に、gid と名前の対応を `/etc/group` に持っています。この章ではその2つのファイルを読んで変換します。

## /etc/passwd の形式

`/etc/passwd` は1行が1ユーザーの情報です。

```text
root:x:0:0:root:/root:/bin/bash
nobody:x:65534:65534:nobody:/nonexistent:/usr/sbin/nologin
user:x:1000:1000::/home/user:/bin/bash
```

フィールドは `:` で区切られ、左から順に並んでいます。

| 位置 | 内容 |
|------|------|
| 0 | ユーザー名 |
| 1 | パスワード（`x` は shadow に移動済みを意味する） |
| 2 | uid |
| 3 | gid |
| 4 | コメント |
| 5 | ホームディレクトリ |
| 6 | シェル |

uid が一致する行を見つけて、位置 0 のフィールドを返せば名前が得られます。

## uid を名前に変換する

`lookup_user` 関数を書きます。

```rust
fn lookup_user(uid: u32) -> String {
    let contents = match fs::read_to_string("/etc/passwd") {
        Ok(s) => s,
        Err(_) => return uid.to_string(),
    };
    let uid_str = uid.to_string();
    for line in contents.lines() {
        let fields: Vec<&str> = line.split(':').collect();
        if let Some(&id) = fields.get(2) {
            if id == uid_str {
                return fields[0].to_string();
            }
        }
    }
    uid.to_string()
}
```

`read_to_string` でファイル全体を文字列として読み、`.lines()` で1行ずつ取り出します。各行は `split(':').collect()` でフィールドの配列に分解します。

存在しないインデックスへのアクセスでパニックしないよう、`Vec` の要素取得には `get()` を使います。`Vec<&str>` の `get()` は `Option<&&str>` を返します。`if let Some(&id) = fields.get(2)` と書くことで `&&str` を1段デリファレンスし、`id: &str` として取り出せます。uid と一致すれば位置 0 を返します。`get(2)` が `Some` を返した時点で配列に3要素以上あることが確定しているため、`fields[0]` のインデックスアクセスは安全です。

最後の `uid.to_string()` はファイルに該当する行がなかった場合のフォールバックです。`/etc/passwd` にない uid はそのまま数字で表示します。

## /etc/group も同じ構造で引く

`/etc/group` の形式は `/etc/passwd` と似ています。

```text
root:x:0:
nogroup:x:65534:
user:x:1000:user
```

4フィールド構成で、左から順にグループ名・パスワード・gid・メンバーリストです。位置 0 がグループ名、位置 2 が gid です。`lookup_group` は `lookup_user` とほぼ同じ構造になります。

```rust
fn lookup_group(gid: u32) -> String {
    let contents = match fs::read_to_string("/etc/group") {
        Ok(s) => s,
        Err(_) => return gid.to_string(),
    };
    let gid_str = gid.to_string();
    for line in contents.lines() {
        let fields: Vec<&str> = line.split(':').collect();
        if let Some(&id) = fields.get(2) {
            if id == gid_str {
                return fields[0].to_string();
            }
        }
    }
    gid.to_string()
}
```

## main.rs を更新する

`lookup_user` と `lookup_group` を `main.rs` に追加します（置き場所は `format_mtime` の後ろで構いません）。

`main` 内の `println!` で `uid` と `gid` を関数呼び出しに変えます。ディレクトリの場合（末尾が `name`）とファイルの場合（末尾が `path`）の2箇所あります。

```diff
-            println!("{} {} {} {} {} {} {}", perm::format_mode(mode), nlink, uid, gid, size, mtime, name);
+            println!("{} {} {} {} {} {} {}", perm::format_mode(mode), nlink, lookup_user(uid), lookup_group(gid), size, mtime, name);
```

```diff
-        println!("{} {} {} {} {} {} {}", perm::format_mode(mode), nlink, uid, gid, size, mtime, path);
+        println!("{} {} {} {} {} {} {}", perm::format_mode(mode), nlink, lookup_user(uid), lookup_group(gid), size, mtime, path);
```

## 動かして確かめる

```sh
$ cargo run
```

```text
-rw-r--r-- 1 user user    284 Jul 10 17:05 Cargo.toml
-rw-r--r-- 1 user user    512 Jul 10 17:05 README.md
drwxr-xr-x 2 user user   4096 Jul 10 17:05 src
```

uid と gid が名前に変わり、`ls -al` の出力とほぼ同じ形になりました。次章では size 列の幅を全エントリの最大桁数に合わせて動的に揃えます。
