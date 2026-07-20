# void* の代わりに trait

C言語 には、「この型はこの操作ができる」と宣言する仕組みがありません。複数の型に同じ操作をさせたいとき、C では関数ポインタを使って手で切り替えます。Rust の trait はその宣言をコンパイラが管理する形にしたものです。この章では、C と Rust の書き方を並べて、何が変わるかを見ます。

フィードに並ぶ項目（記事と投稿）を、種類に関係なく一行で要約する、という場面で進めます。

## C の関数ポインタ — 切り替えは手で書く

C で「記事も投稿も同じ関数で要約したい」とするとき、やり方はいくつかあります。よく使われるのは、操作を関数ポインタとして構造体に持たせる方法です。

```c
// C
#include <stdio.h>

typedef struct {
    const char *title;
    const char *body;
} Article;

typedef struct {
    const char *user;
    const char *text;
} Tweet;

void summarize_article(const Article *a) {
    printf("%s\n", a->title);
}

void summarize_tweet(const Tweet *t) {
    printf("@%s: %s\n", t->user, t->text);
}
```

「種類によらず要約する」関数を書こうとすると、`void*` で受け取ってタグで切り替えるしかありません。

```c
// C
typedef enum { KIND_ARTICLE, KIND_TWEET } Kind;

void summarize(Kind kind, void *item) {
    if (kind == KIND_ARTICLE) {
        summarize_article((Article *)item);
    } else {
        summarize_tweet((Tweet *)item);
    }
}

int main(void) {
    Article a = { "Rust 入門", "所有権から始めよう" };
    Tweet   t = { "blue", "trait を覚えた" };
    summarize(KIND_ARTICLE, &a); // Rust 入門
    summarize(KIND_TWEET,   &t); // @blue: trait を覚えた
}
```

新しい種類が増えるたびに `summarize` の中の `if` を増やさなければなりません。

```c
// C — 動画(Video)を追加するとき
typedef enum { KIND_ARTICLE, KIND_TWEET, KIND_VIDEO } Kind; // enum を増やして

void summarize_video(const Video *v) { ... }

void summarize(Kind kind, void *item) {
    if (kind == KIND_ARTICLE) {
        summarize_article((Article *)item);
    } else if (kind == KIND_TWEET) {
        summarize_tweet((Tweet *)item);
    } else if (kind == KIND_VIDEO) {   // ここを足す
        summarize_video((Video *)item);
    }
    // 追加し忘れても、コンパイラは何も言わない
}
```

`void*` に間違った型を渡しても、コンパイラは気づきません。

```c
// C
Article a = { "Rust 入門", "所有権から始めよう" };
summarize(KIND_TWEET, &a); // @Rust 入門: 所有権から始めよう
                           // Article と Tweet のレイアウトが同じなのでたまたま動く
                           // レイアウトが違う型同士ならクラッシュや文字化けになる
```

## Rust の trait — 「要約できる」を型で宣言する

Rust では「要約できる」という操作を trait として宣言します。

```rust
// Rust
trait Summary {
    fn summary(&self) -> String;
}
```

`&self` は C で第一引数として渡していた構造体ポインタにあたります。呼び出し元の値を借りて読むために受け取ります。

この trait を `Article` と `Tweet` それぞれに実装します。

```rust
// Rust
struct Article {
    title: String,
    body: String,
}

impl Summary for Article {
    fn summary(&self) -> String {
        self.title.clone()
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

`impl Summary for Article` のブロックに、`Article` での `summary` の中身を書きます。C で型ごとに別の関数を書いていたものが、同じ trait の `impl` として型に紐づきます。

## 共通の操作に、一つの関数を書く

`Summary` を満たす型なら何でも受け取る関数は `&impl Summary` で書きます。

```rust
// Rust
# trait Summary { fn summary(&self) -> String; }
# struct Article { title: String, body: String }
# impl Summary for Article { fn summary(&self) -> String { self.title.clone() } }
# struct Tweet { user: String, text: String }
# impl Summary for Tweet { fn summary(&self) -> String { format!("@{}: {}", self.user, self.text) } }
fn print_summary(item: &impl Summary) {
    println!("{}", item.summary());
}

fn main() {
    let a = Article { title: "Rust 入門".to_string(), body: "所有権から始めよう".to_string() };
    let t = Tweet  { user: "blue".to_string(), text: "trait を覚えた".to_string() };
    print_summary(&a); // Rust 入門
    print_summary(&t); // @blue: trait を覚えた
}
```

C では `void*` と `Kind` タグを渡していたところが、`&impl Summary` になります。渡した型が `Summary` を実装していなければコンパイルエラーになります。

```rust
// Rust
# trait Summary { fn summary(&self) -> String; }
# fn print_summary(item: &impl Summary) { println!("{}", item.summary()); }
struct Video { url: String }
// impl Summary for Video を書いていない

fn main() {
    let v = Video { url: "https://example.com".to_string() };
    print_summary(&v); // エラー: `Video` doesn't implement `Summary`
}
```

新しい種類を追加するときは `impl Summary for 新しい型` を書くだけで、`print_summary` には手を入れません。

---

C の関数ポインタと `void*` で手で切り替えていた汎用の操作が、Rust では trait と `impl` による宣言になります。どの型がどの操作を持つかをコンパイラが管理するので、追加し忘れや型の取り違えはコンパイル時に出ます。次の章では、C の未定義動作と、Rust の `unsafe` によるその扱いを見ます。
