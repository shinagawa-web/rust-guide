# 中級

Bluetooth でマイコンとスマホが通信する仕組みを、BLE と呼びます。これを実機で動かしながら一から組み立てます。初級編で LED を動かすところまで来た人が、次に踏み込む一歩として設計してあります。

作るのはこういうものです。micro:bit の温度センサが拾った値を、スマホのブラウザでリアルタイムに表示する。スマホのボタンを押すと、micro:bit の LED が切り替わる。アプリのインストールは要りません。

[![Image from Gyazo](https://i.gyazo.com/81919a50aad7f01fab7682c4fd6c9e0b.gif)](https://gyazo.com/81919a50aad7f01fab7682c4fd6c9e0b)

## 用意するもの

- micro:bit v2。初級編と同じボードです。
- USB ケーブル。書き込みに使います。
- Android スマホ（Chrome ブラウザ）。Web Bluetooth API を使います。iOS の Safari は 2026年7月時点で未対応のため、iPhone では動きません。

Android スマホが手元にない場合、Mac の Chrome でも動作します。

## 題材にするもの

初級編で最後に作ったプログラムをベースに、BLE で通信できる形に育てていきます。マイコン側のプログラムと、スマホで開く Web ページの2本立てです。

できあがるコードは次のリポジトリに置いてあります。

<https://github.com/shinagawa-web/rust-guide-sample-intermediate-embedded>

動く Web ページは GitHub Pages で公開しています。

<https://shinagawa-web.github.io/rust-guide-sample-intermediate-embedded/web/>

## このガイドの進め方

全 6 ページ。手元に micro:bit とスマホを置いて、書き込みながら読み進めてください。

1. BLE の全体像。スマホと繋がるまでの登場人物を把握する
2. SoftDevice を入れてスマホに認識させる。2章が最初の山場。SoftDevice のセットアップとアドバタイズ
3. 気温データを送る。Notify でスマホに値を届ける
4. コマンドを受け取る。Write でスマホから LED を操作する
5. Web ページを作る。HTML と JavaScript でスマホの画面を実装する
6. ここまでとこの先。学んだことを振り返る

2章が最初の山場です。セットアップの手順が多く、初級編より時間がかかります。ここを通り抜ければ、あとはコードを積み上げるだけです。
