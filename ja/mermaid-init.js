// mermaid 本体は repo に同梱せず CDN から読み込む（再現性のためバージョン固定）。
// mdbook-mermaid の preprocessor が ```mermaid を <pre class="mermaid"> に変換し、
// このスクリプトがブラウザ側で図としてレンダリングする。
// additional-js は通常 script として読み込まれるため、静的 import ではなく
// 動的 import() を使う。
const MERMAID_CDN =
    'https://cdn.jsdelivr.net/npm/mermaid@11.15.0/dist/mermaid.esm.min.mjs';

(async () => {
    // このページに図が無ければ CDN を取りに行かない
    if (!document.querySelector('pre.mermaid')) {
        return;
    }

    const { default: mermaid } = await import(MERMAID_CDN);

    const darkThemes = ['ayu', 'navy', 'coal'];
    const lightThemes = ['light', 'rust'];

    const classList = document.getElementsByTagName('html')[0].classList;

    let lastThemeWasLight = true;
    for (const cssClass of classList) {
        if (darkThemes.includes(cssClass)) {
            lastThemeWasLight = false;
            break;
        }
    }

    const theme = lastThemeWasLight ? 'default' : 'dark';
    // 動的 import 完了時には DOMContentLoaded が発火済みのことが多いため、
    // startOnLoad に頼らず明示的に run() する。
    mermaid.initialize({ startOnLoad: false, theme });
    await mermaid.run();

    // テーマ切り替え時は最も簡単な方法としてページをリロードして再描画する
    for (const darkTheme of darkThemes) {
        document.getElementById(darkTheme).addEventListener('click', () => {
            if (lastThemeWasLight) {
                window.location.reload();
            }
        });
    }

    for (const lightTheme of lightThemes) {
        document.getElementById(lightTheme).addEventListener('click', () => {
            if (!lastThemeWasLight) {
                window.location.reload();
            }
        });
    }
})();
