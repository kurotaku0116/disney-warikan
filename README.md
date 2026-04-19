# disney-warikan-starter

ディズニー向けの軽量な割り勘アプリのスターターです。

## できること
- イベント作成
- メンバー名だけ登録
- 支出登録
- 誰が払ったか / 誰の分かの管理
- 精算結果の自動計算
- カテゴリ円グラフ / メンバー棒グラフ
- 精算結果を PNG で保存

## 1. セットアップ
```bash
npm install
cp .env.example .env.local
```

`.env.local` に Supabase の URL と anon key を入れてください。

## 2. Supabase
Supabase SQL Editor に `supabase.sql` をそのまま貼って実行します。

## 3. 起動
```bash
npm run dev
```

## 4. 画面
- `/` ホーム
- `/events/new` イベント作成
- `/events/[id]` イベント詳細 / メンバー追加 / 支出一覧
- `/events/[id]/expenses/new` 支出追加
- `/events/[id]/result` 精算結果

## 5. 補足
- 画像保存は端末に PNG ダウンロードする方式です。
- 今回は「自分だけ使う」前提なので、認証は入れていません。
- RLS は最小限で開いています。公開運用する前には認証付きに変えた方が安全です。
