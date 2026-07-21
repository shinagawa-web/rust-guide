# 中級

スマートロックをスマホで解錠する。体重計が測定値をアプリに送る。スマートウォッチがリアルタイムで心拍を表示する。これらはすべて、BLE（Bluetooth Low Energy）という近距離無線で繋がっています。

この中級編では、micro:bit をそういうデバイスにします。初級編で LED を光らせるところまで来た人が、次に踏み込む一歩として設計してあります。

作るのはこういうものです。micro:bit の温度センサが拾った値が、無線でスマホのブラウザにリアルタイムで届く。スマホのブラウザのボタンを押すと、コマンドが無線で micro:bit に届き、LED のパターンが切り替わる。アプリのインストールは要りません。

[![Image from Gyazo](https://i.gyazo.com/81919a50aad7f01fab7682c4fd6c9e0b.gif)](https://gyazo.com/81919a50aad7f01fab7682c4fd6c9e0b)

## 用意するもの

- micro:bit v2。初級編と同じボードです。
- USB ケーブル。書き込みに使います。
- Android スマホ（Chrome ブラウザ）。スマホのブラウザから micro:bit に接続します。iOS はブラウザを問わず動作しません（2026年7月時点）。

Android スマホが手元にない場合、Mac の Chrome でも動作します。

## 題材にするもの

初級編で最後に作ったプログラムをベースに、スマホと通信できる形に育てていきます。市販のデバイスと同じ仕組みで、自分で書いたコードがスマホと会話します。マイコン側のプログラムと、スマホで開く Web ページの2本立てです。

できあがるコードは次のリポジトリに置いてあります。

<https://github.com/shinagawa-web/rust-guide-sample-intermediate-embedded>

動く Web ページは GitHub Pages で公開しています。

<https://shinagawa-web.github.io/rust-guide-sample-intermediate-embedded/web/>

## このガイドの進め方

全 6 ページ。手元に micro:bit とスマホを置いて、書き込みながら読み進めてください。

1. [マイコンとスマホが繋がる仕組み](intermediate/ble-overview.md)。スマホと繋がる仕組みの登場人物を把握する
2. [スマホから micro:bit を見つける](intermediate/advertising.md)。最初の山場。セットアップの手順が多い
3. 気温データを送る。センサの値をスマホのブラウザにリアルタイムで届ける
4. コマンドを受け取る。スマホのボタンで micro:bit の LED を操作する
5. Web ページを作る。HTML と JavaScript でスマホの画面を作る
6. ここまでとこの先。学んだことを振り返る

2章が最初の山場です。セットアップの手順が多く、初級編より時間がかかります。ここを通り抜ければ、あとはコードを積み上げるだけです。
