# 構造的な型の代わりに trait

TypeScript の型は構造的です。`interface` はメンバーの形を並べたもので、その形さえ合っていれば、どんな値でもその型として通ります。`class X implements Y` と書くこともできますが、必須ではありません。`implements` を書かなくても、形が合っていればその型を満たしたことになります。

Rust で「共通の振る舞い」を表すのは trait です。考え方は TypeScript の interface とよく似ています。違うのは一点、ある型がその trait を満たすことを `impl` で自分で書く点です。TypeScript の「形が合えば満たす」に対して、Rust は「満たすと書いて満たす」です。振る舞いを一箇所に決め、複数の型で実装し、その振る舞いに対して一つの関数を書く。この流れは同じです。

この章は、フィードに並ぶ項目を種類によらず一行に要約する、という場面で進めます。項目には記事も投稿もあり、それぞれ要約のしかたは違うけれど、「要約できる」という一点は共通です。

## TypeScript では、形が合えば満たす

「要約できる」という振る舞いを `interface` にします。記事(Article)と投稿(Tweet)はそれぞれ `summary()` を持っていて、それだけで `Summary` を満たします。

```ts
// TypeScript
interface Summary {
  summary(): string;
}

class Article {
  constructor(private title: string, private body: string) {}
  summary(): string {
    return `${this.title}（${[...this.body].length}字）`;
  }
}

class Tweet {
  constructor(private user: string, private text: string) {}
  summary(): string {
    return `@${this.user}: ${this.text}`;
  }
}
```

`Article` も `Tweet` も、`class Article implements Summary` のようには書いていません。それでも `summary(): string` を持っているという形の一致だけで、`Summary` を満たしたことになります。

満たしていれば、`Summary` を受け取る一つの関数に、`Article` も `Tweet` もそのまま渡せます。種類ごとに書き分けなくて済みます。

```ts
// TypeScript
function printSummary(s: Summary) {
  console.log(s.summary());
}

printSummary(new Article("Rust 入門", "所有権から始めよう")); // Rust 入門（9字）
printSummary(new Tweet("blue", "trait を覚えた"));            // @blue: trait を覚えた
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

`impl Summary for Article` のブロックに、その型での `summary` の中身を書きます。メソッドの第一引数 `&self` は、TypeScript のメソッド内の `this` にあたり、その値自身を読むために借りています。`format!` は `println!` と同じ書式指定で、画面に出さずに文字列を作って返すものだと思ってください。`chars().count()` は文字数を数えていて、`[...body].length` にあたります。

TypeScript と違うのは `impl Summary for Article` の一行です。この型が `Summary` を満たすことを、自分で宣言します。TypeScript は形が合えば黙って満たしましたが、Rust は満たすことをコードに書きます。

明示にする利点は、型と trait を後から結び付けられることです。`impl` は型の定義とは別に書くので、標準ライブラリが用意した trait（値の表示や、繰り返しの反復など）に自分の型を対応させることも、自分で決めた trait を標準ライブラリの型に実装することもできます。どの型がどの振る舞いを持つかが、宣言として一箇所ずつ残ります。

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

引数の型に書いた `&impl Summary` は「`Summary` を満たす何か（を借りたもの）」という意味です。TypeScript の `printSummary(s: Summary)` が `Summary` を満たす値を受け取ったのと、同じ使い心地です。関数を具体的な型ではなく、振る舞いに対して書けます。

なお `"Rust 入門".to_string()` は、`struct` に持たせる `String` を文字列リテラルから作っています。ここでは「文字列を用意している」くらいの読み方で先に進んで差し支えありません。

## 種類の違うものを、一つの一覧にまとめる

フィードは記事と投稿が混ざった一覧です。TypeScript なら `Summary[]` に、そのまま両方を入れられます。

```ts
// TypeScript
const feed: Summary[] = [
  new Article("Rust 入門", "所有権から始めよう"),
  new Tweet("blue", "trait を覚えた"),
];
for (const item of feed) {
  console.log(item.summary());
}
```

Rust では、同じようにはいきません。関数の引数なら `&impl Summary` の一言で済みましたが、いろいろな型を一つの入れ物にためるとなると事情が変わります。`Vec` は一種類の型しか並べられないので、別々の型である `Article` と `Tweet` を、そのまま同じ `Vec` には混ぜられません。そこで「`Summary` を満たす何か」を表す `dyn Summary` を使いますが、これは中身が `Article` か `Tweet` かで大きさが変わるため、`Vec` の一マスにそのままは収まりません。`Box` で包んでポインタにすると、どちらも同じ大きさになり、`Vec<Box<dyn Summary>>` として一覧に並べられます。

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

`dyn Summary` は「どの型かは実行時に決まる、`Summary` を満たすもの」です。呼ばれる `summary` が実行時に選ばれるのは、TypeScript で `Summary` 型の変数に対してメソッドを呼ぶと、中身が `Article` か `Tweet` かに応じた実装が動くのと同じです。TypeScript はそれを黙って行い、Rust は `Box<dyn Summary>` と書いて明示します。

TypeScript の構造的な interface は、Rust では trait になります。違うのは、満たすことを `impl` で明示する点だけでした。次は、TypeScript の union 型にあたるものです。値の種類そのものを型で分ける Rust の enum と、それを取り出す match を見ます。
