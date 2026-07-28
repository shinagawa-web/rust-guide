# size 列の幅を動的に揃える

前章まででパーミッション・nlink・user・group・size・mtime・name の7列がそろいました。ただし size 列の幅は 6 に固定しています。ファイルサイズが 7 桁以上になると幅が崩れますし、小さいサイズのファイルしかないディレクトリでは空白が余りすぎます。

`ls -al` はそのディレクトリのエントリの中で最も桁数の多い size に合わせて全行を揃えます。この章ではその動的な整列を実装します。

## エントリを struct にまとめる

動的な幅を決めるには、まず全エントリを集めてから表示幅を計算する、2段構えの処理が要ります。そのためにエントリ1件分のデータをまとめて持つ struct を作ります。

```rust
struct Entry {
    mode: String,
    nlink: u64,
    user: String,
    group: String,
    size: u64,
    mtime: String,
    name: String,
}
```

`size` だけ `u64` のまま保持します。表示幅の計算に使うためです。他のフィールドは表示用の文字列に変換済みの値を入れます。

表示ロジックは `impl` で struct に持たせます。`impl` はある型にメソッドを追加する構文です。`self` でその型のフィールドにアクセスでき、データと操作を1か所にまとめられます。

```rust
impl Entry {
    fn display(&self, size_width: usize) -> String {
        format!(
            "{} {} {} {} {:>width$} {} {}",
            self.mode, self.nlink, self.user, self.group,
            self.size, self.mtime, self.name,
            width = size_width
        )
    }
}
```

`{:>width$}` は幅を変数で受け取る書き方です。`width$` の末尾の `$` が「引数として渡された値を幅に使う」という指定で、`format!` の末尾で `width = size_width` のように渡します。

## エントリを集める処理を切り出す

これまで `main` の中に書いていたエントリ収集を関数に分けます。

```rust
fn entry_from_meta(meta: &fs::Metadata, name: String) -> Entry {
    Entry {
        mode: perm::format_mode(meta.permissions().mode()),
        nlink: meta.nlink(),
        user: lookup_user(meta.uid()),
        group: lookup_group(meta.gid()),
        size: meta.size(),
        mtime: format_mtime(meta.mtime()),
        name,
    }
}

fn collect_entries(path: &str) -> Result<Vec<Entry>, std::io::Error> {
    let metadata = fs::metadata(path)?;
    if metadata.is_dir() {
        let mut dir_entries: Vec<_> = fs::read_dir(path)?.filter_map(|e| e.ok()).collect();
        dir_entries.sort_by_key(|e| e.file_name());
        let mut entries = Vec::new();
        for entry in dir_entries {
            if let Ok(meta) = entry.metadata() {
                entries.push(entry_from_meta(&meta, entry.file_name().to_string_lossy().into_owned()));
            }
        }
        Ok(entries)
    } else {
        Ok(vec![entry_from_meta(&metadata, path.to_string())])
    }
}
```

`collect_entries` の戻り値は `Result<Vec<Entry>, std::io::Error>` です。エラーが起きたら呼び出し元に返し、起きなければ `Vec<Entry>` を返します。

`fs::metadata(path)?` の末尾の `?` がその橋渡しをしています。`?` は `Err` なら即座に呼び出し元へ返し、`Ok` なら中身を取り出す演算子です。`match { Ok(v) => v, Err(e) => return Err(e) }` と同じ意味で、エラー処理の `match` を1文字で書けます。

## main を整理する

`main` はエントリを集め、最大桁数を求めて表示するだけになります。これまで使っていた `format_size` は不要になるので削除します。

```rust
fn main() {
    let args: Vec<String> = env::args().collect();
    let path: &str = if args.len() < 2 { "." } else { &args[1] };

    let entries = match collect_entries(path) {
        Ok(e) => e,
        Err(e) => {
            eprintln!("エラー: {}: {}", path, e);
            process::exit(1);
        }
    };

    let size_width = entries
        .iter()
        .map(|e| e.size.to_string().len())
        .max()
        .unwrap_or(1);

    for e in &entries {
        println!("{}", e.display(size_width));
    }
}
```

`entries.iter().map(...).max()` で全エントリの size を文字列にしたときの桁数を比べ、最大値を取ります。エントリがゼロ件のときのために `.unwrap_or(1)` で 1 を使います。

## 動かして確かめる

```sh
$ cargo run
```

```text
-rw-r--r-- 1 user user  284 Jul 10 17:05 Cargo.toml
-rw-r--r-- 1 user user  512 Jul 10 17:05 README.md
drwxr-xr-x 2 user user 4096 Jul 10 17:05 src
```

エントリ中の最大桁数が 4 桁（`4096`）なので、`284` と `512` は 4 桁幅に右寄せされています。

ファイルサイズが幅広いディレクトリで試してみます。

```sh
$ cargo run -- /etc
```

```text
-rw-r--r-- 1 root root    33 Jul  1 00:00 hostname
-rw-r--r-- 1 root root   682 Jul  1 00:00 hosts
drwxr-xr-x 2 root root  4096 Jul  1 00:00 init.d
-rw-r--r-- 1 root root 92892 Jul  1 00:00 ld.so.cache
```

最大桁数が 5 桁（`92892`）になり、その幅に合わせて全行が揃っています。`ls -al` と同じ列構成の出力が完成しました。
