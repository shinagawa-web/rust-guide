# サイズと更新日時を表示する

前章で stat の各フィールドを読み出せるようになりました。今の出力はこうです。

```text
-rw-r--r-- 1 1000 1000 284 1720598720 Cargo.toml
-rw-r--r-- 1 1000 1000 512 1720598720 README.md
drwxr-xr-x 2 1000 1000 4096 1720598720 src
```

`ls -al` と比べると、size（284）は右に揃えられておらず、mtime は Unix エポックからの秒数（1720598720）のまま読める日付になっていません。この章ではその2つを整えます。

## サイズを右に揃える

`ls -al` の size 列は数字が右揃えで並んでいます。Rust の `format!` は `{:>幅}` という書き方で右揃えを指定できます。

```rust
format!("{:>6}", 284)    // "   284"
format!("{:>6}", 4096)   // "  4096"
```

`:>` の後ろの数字がフィールド幅です。値がその幅より短ければ左に空白が埋まります。ここでは幅を 6 に固定します。ファイル数が増えて最大桁数が変わる場合に幅を動的に決める処理は、最後の章で組み上げます。

## mtime を日付文字列に変換する

`meta.mtime()` が返す `i64` は、Unix エポック（1970年1月1日00:00:00 UTC）からの経過秒数です。この秒数を人が読める形にするには、日付と時刻への変換が要ります。

標準ライブラリにはカレンダー計算の機能がないため、`chrono` クレートを使います。`chrono` は Unix 秒からローカル日時への変換と書式指定をまとめて行えます。

`Cargo.toml` の `[dependencies]` に追加します。

```toml
[dependencies]
chrono = "0.4"
```

変換と書式指定はこう書きます。

```rust
use chrono::{DateTime, Local};
use std::time::{Duration, UNIX_EPOCH};

fn format_mtime(secs: i64) -> String {
    let system_time = UNIX_EPOCH + Duration::from_secs(secs as u64);
    let datetime: DateTime<Local> = system_time.into();
    datetime.format("%b %e %H:%M").to_string()
}
```

`UNIX_EPOCH` に秒数分の `Duration` を足すと `SystemTime` になります。それを `DateTime<Local>` に変換すると、実行環境のタイムゾーンに合わせた日時が得られます。

`format!` に渡している `"%b %e %H:%M"` は `ls -al` と同じ並びです。

| 指定子 | 意味 | 例 |
|--------|------|----|
| `%b` | 月の略称 | `Jul` |
| `%e` | 日（空白で桁揃え） | ` 9`, `10` |
| `%H` | 24時間形式の時 | `09` |
| `%M` | 分 | `12` |

## main.rs を更新する

`format_size` と `format_mtime` を関数として定義し、`main` 内の `println!` でそれを使います。

```rust
use chrono::{DateTime, Local};
use std::env;
use std::fs;
use std::os::unix::fs::MetadataExt;
use std::os::unix::fs::PermissionsExt;
use std::process;
use std::time::{Duration, UNIX_EPOCH};

mod perm;

fn format_size(size: u64) -> String {
    format!("{:>6}", size)
}

fn format_mtime(secs: i64) -> String {
    let system_time = UNIX_EPOCH + Duration::from_secs(secs as u64);
    let datetime: DateTime<Local> = system_time.into();
    datetime.format("%b %e %H:%M").to_string()
}

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
            let size = format_size(meta.size());
            let mtime = format_mtime(meta.mtime());
            let name = entry.file_name().to_string_lossy().to_string();
            println!("{} {} {} {} {} {} {}", perm::format_mode(mode), nlink, uid, gid, size, mtime, name);
        }
    } else {
        let mode = metadata.permissions().mode();
        let nlink = metadata.nlink();
        let uid = metadata.uid();
        let gid = metadata.gid();
        let size = format_size(metadata.size());
        let mtime = format_mtime(metadata.mtime());
        println!("{} {} {} {} {} {} {}", perm::format_mode(mode), nlink, uid, gid, size, mtime, path);
    }
}
```

## 動かして確かめる

```sh
$ cargo run
```

```text
-rw-r--r-- 1 1000 1000    284 Jul 10 17:05 Cargo.toml
-rw-r--r-- 1 1000 1000    512 Jul 10 17:05 README.md
drwxr-xr-x 2 1000 1000   4096 Jul 10 17:05 src
```

mtime の表示は実行環境のタイムゾーンに従うため、上とは異なる値が出ることがあります。uid と gid はまだ数字のままです。次章でそれを名前に変換します。
