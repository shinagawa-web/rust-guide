# ファイルのメタデータを読む

前章で配れる形にした fmode は、パーミッション（permissions）とファイル名しか表示しません。`ls -al` を見ると、その右にリンク数・所有者・グループ・サイズ・更新日時が並んでいます。

```text
-rw-r--r-- 1 user user   284 Jul 10 09:12 Cargo.toml
```

このデータはどこから来るのでしょうか。

## 7列のうち6列は stat() が返す

`ls -al` がファイルについて出す情報の6列は、OS のシステムコール `stat()` が1度の呼び出しで返す構造体から来ています。`stat` は「status」の略で、ファイルの状態を表します。

そのうち permissions はすでに実装済みです。今回新たに読み出すのは残りの5つです。

- `nlink`: そのファイルへのハードリンク数（nlink = number of links）
- `uid`: 所有者のユーザーID（uid = user id）
- `gid`: 所有グループのID（gid = group id）
- `size`: バイト単位のファイルサイズ
- `mtime`: 最終更新時刻。Unix エポックからの秒数（mtime = modification time）

ファイル名だけは別の話です。`stat()` はパスを受け取ってメタデータを返すシステムコールで、ファイル名は返しません。ディレクトリエントリを読むことで得ます。`entry.file_name()` がまさにそれをやっています。

permissions も `mode` フィールドとして `stat()` から来ています。

## Metadata が stat の結果を包んでいる

Rust では `fs::metadata()` を呼ぶと `Metadata` 構造体が返ります。これが内部で OS の `stat()` を呼び出し、結果を包んでいます。

`meta.permissions().mode()` は、その `stat` 結果の1フィールドにすぎません。残りのフィールドを読み出すには、`use std::os::unix::fs::MetadataExt` を追加します。

```rust
use std::os::unix::fs::MetadataExt;
```

これで `Metadata` に次のメソッドが生えます。

```rust
meta.nlink()   // u64 — ハードリンク数
meta.uid()     // u32 — ユーザーID
meta.gid()     // u32 — グループID
meta.size()    // u64 — バイト数
meta.mtime()   // i64 — Unix エポックからの秒数
```

`uid` や `gid` は数字のままです。`user` や `staff` という名前には変換されません。名前への変換は次章以降で行います。

## main.rs に追加して数字を出す

`use std::os::unix::fs::MetadataExt;` を追加して、各フィールドを読み出します。

```rust
use std::env;
use std::fs;
use std::os::unix::fs::MetadataExt;
use std::os::unix::fs::PermissionsExt;
use std::process;

mod perm;

fn main() {
    let args: Vec<String> = env::args().collect();

    let path = if args.len() < 2 {
        ".".to_string()
    } else {
        args[1].clone()
    };

    let metadata = match fs::metadata(&path) {
        Ok(m) => m,
        Err(e) => {
            eprintln!("エラー: {}: {}", path, e);
            process::exit(1);
        }
    };

    if metadata.is_dir() {
        let mut entries: Vec<_> = match fs::read_dir(&path) {
            Ok(rd) => rd.filter_map(|e| e.ok()).collect(),
            Err(e) => {
                eprintln!("エラー: {}: {}", path, e);
                process::exit(1);
            }
        };
        entries.sort_by_key(|e| e.file_name());
        for entry in entries {
            let meta = match entry.metadata() {
                Ok(m) => m,
                Err(_) => continue,
            };
            let mode = meta.permissions().mode();
            let nlink = meta.nlink();
            let uid = meta.uid();
            let gid = meta.gid();
            let size = meta.size();
            let mtime = meta.mtime();
            let name = entry.file_name().to_string_lossy().to_string();
            println!("{} {} {} {} {} {} {}", perm::format_mode(mode), nlink, uid, gid, size, mtime, name);
        }
    } else {
        let mode = metadata.permissions().mode();
        let nlink = metadata.nlink();
        let uid = metadata.uid();
        let gid = metadata.gid();
        let size = metadata.size();
        let mtime = metadata.mtime();
        println!("{} {} {} {} {} {} {}", perm::format_mode(mode), nlink, uid, gid, size, mtime, path);
    }
}
```

`cargo run` で動かすと、こう出ます（数字は環境によって変わります）。

```text
-rw-r--r-- 1 1000 1000 284 1720598720 Cargo.toml
-rw-r--r-- 1 1000 1000 512 1720598720 README.md
drwxr-xr-x 2 1000 1000 4096 1720598720 src
```

stat の各フィールドがそのまま並んでいます。

次章では size と mtime を `ls -al` と同じ表示形式に整えます。
