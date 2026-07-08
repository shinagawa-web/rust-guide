# interface の代わりに trait

Go の interface は、メソッドの集まりです。ある型がそのメソッドを持っていれば、その型は自動でその interface を満たします。型の側に「この interface を満たす」と書き添える必要はありません。

Rust で「共通の振る舞い」を表すのは trait です。考え方は Go とよく似ています。違うのは一点、ある型がその trait を満たすことを `impl` で自分で書く点です。Go の暗黙に対して、Rust は明示です。振る舞いを一箇所に決め、複数の型でそれを実装し、その振る舞いに対して一つの関数を書く、という流れ自体は Go と同じです。

この章は、フィードに並ぶ項目を種類によらず一行に要約する、という場面で進めます。項目には記事も投稿もあり、それぞれ要約のしかたは違うけれど、「要約できる」という一点は共通です。

## Go では、メソッドを持てば interface を満たす

「要約できる」という振る舞いを interface にします。記事(Article)と投稿(Tweet)はそれぞれ `Summary()` を持ち、それだけで `Summary` interface を満たします。

```go
// Go
type Summary interface {
    Summary() string
}

type Article struct {
    Title string
    Body  string
}

func (a Article) Summary() string {
    return fmt.Sprintf("%s（%d字）", a.Title, len([]rune(a.Body)))
}

type Tweet struct {
    User string
    Text string
}

func (t Tweet) Summary() string {
    return fmt.Sprintf("@%s: %s", t.User, t.Text)
}
```

`Article` も `Tweet` も、`Summary()` メソッドを持つというだけで `Summary` interface を満たします。「この型はこの interface を満たす」とはどこにも書きません。メソッドの形が合っていれば、それで満たしたことになります。

満たしていれば、`Summary` を受け取る一つの関数に、`Article` も `Tweet` もそのまま渡せます。種類ごとに書き分けなくて済みます。

```go
// Go
func printSummary(s Summary) {
    fmt.Println(s.Summary())
}

printSummary(Article{Title: "Rust 入門", Body: "所有権から始めよう"}) // Rust 入門（9字）
printSummary(Tweet{User: "blue", Text: "trait を覚えた"})           // @blue: trait を覚えた
```

`printSummary` は `Article` も `Tweet` も知りません。`Summary` を満たすもの、としか思っていない。それでも両方を渡せます。

## Rust では、満たすことを impl で宣言する（trait）

同じことを Rust で書きます。まず trait で振る舞いを決め、型ごとに `impl` で中身を書きます。

```rust
// Rust
trait Summary {
    fn summary(&self) -> String;
}

struct Article {
    title: String,
    body: String,
}

impl Summary for Article {
    fn summary(&self) -> String {
        format!("{}（{}字）", self.title, self.body.chars().count())
    }
}

struct Tweet {
    user: String,
    text: String,
}

impl Summary for Tweet {
    fn summary(&self) -> String {
        format!("@{}: {}", self.user, self.text)
    }
}
```

違いは `impl Summary for Article` の一行です。この型が `Summary` を満たすことを、自分で宣言します。Go は形が合えば暗黙に満たしましたが、Rust は満たすことをコードに書きます。

明示にする利点は、型と trait を後から結び付けられることです。`impl` は型の定義とは別に書くので、標準ライブラリが用意した trait（値の表示や、繰り返しの反復など）にあなたの型を対応させることも、あなたが決めた trait を標準ライブラリの型に実装することもできます。どの型がどの振る舞いを持つかが、宣言として一箇所ずつ残ります。

## 共通の振る舞いに、一つの関数を書く

さきほどの `printSummary` を Rust でも書いてみます。`Article` か `Tweet` かを問わず、`Summary` を満たすものを受け取ります。

```rust
// Rust
# trait Summary {
#     fn summary(&self) -> String;
# }
# struct Article { title: String, body: String }
# impl Summary for Article {
#     fn summary(&self) -> String { format!("{}（{}字）", self.title, self.body.chars().count()) }
# }
# struct Tweet { user: String, text: String }
# impl Summary for Tweet {
#     fn summary(&self) -> String { format!("@{}: {}", self.user, self.text) }
# }
fn print_summary(item: &impl Summary) {
    println!("{}", item.summary());
}

fn main() {
    let article = Article {
        title: "Rust 入門".to_string(),
        body: "所有権から始めよう".to_string(),
    };
    let tweet = Tweet {
        user: "blue".to_string(),
        text: "trait を覚えた".to_string(),
    };

    print_summary(&article); // Rust 入門（9字）
    print_summary(&tweet);   // @blue: trait を覚えた
}
```

`&impl Summary` は「`Summary` を満たす何か」という意味です。Go の `func printSummary(s Summary)` が `Summary` を満たす値を受け取ったのと、同じ使い心地です。関数は具体的な型ではなく、振る舞いに対して書けます。

## 種類の違うものを、一つの一覧にまとめる

フィードは記事(Article)と投稿(Tweet)が混ざった一覧です。Go なら `Summary` のスライスに、そのまま両方を入れられます。

```go
// Go
feed := []Summary{
    Article{Title: "Rust 入門", Body: "所有権から始めよう"},
    Tweet{User: "blue", Text: "trait を覚えた"},
}
for _, item := range feed {
    fmt.Println(item.Summary())
}
```

Rust では、同じようにはいきません。関数の引数なら `&impl Summary` の一言で済みましたが、いろいろな型を一つの入れ物にためるとなると事情が変わります。`Article` と `Tweet` は別の型でサイズも違うため、一つの `Vec` にそのまま並べては入りません。`Box<dyn Summary>` で包むと、どちらも「`Summary` を満たす何かへのポインタ」という同じ形（同じ大きさ）になり、一覧に並べられます。

```rust
// Rust
# trait Summary {
#     fn summary(&self) -> String;
# }
# struct Article { title: String, body: String }
# impl Summary for Article {
#     fn summary(&self) -> String { format!("{}（{}字）", self.title, self.body.chars().count()) }
# }
# struct Tweet { user: String, text: String }
# impl Summary for Tweet {
#     fn summary(&self) -> String { format!("@{}: {}", self.user, self.text) }
# }
fn main() {
    let feed: Vec<Box<dyn Summary>> = vec![
        Box::new(Article {
            title: "Rust 入門".to_string(),
            body: "所有権から始めよう".to_string(),
        }),
        Box::new(Tweet {
            user: "blue".to_string(),
            text: "trait を覚えた".to_string(),
        }),
    ];

    for item in &feed {
        println!("{}", item.summary());
    }
}
```

`dyn Summary` は「どの型かは実行時に決まる、`Summary` を満たすもの」です。呼ばれる `summary` が実行時に選ばれるのは、Go の interface 値がいつもしていることと同じです。Go はそれを黙って行い、Rust は `Box<dyn Summary>` と書いて明示します。

ここまでで、Go の interface が Rust では trait になり、満たすことを `impl` で明示する点だけが違うことを見ました。次は、Go に無い道具を見ます。値の種類そのものを型で分ける enum と、それを取り出す match です。
