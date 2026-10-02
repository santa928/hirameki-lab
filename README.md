# ひらめきラボ

図形・立体・迷路・論理・数の120ゲーム。5分野各24ゲーム、全8,209ステージ（1ステージ10問、82,090問）を収録しています。ステージ・3ぷん・じっくりの3モード、ヒント、動くお手本、読み上げと効果音に対応します。

公開先: https://santa928.github.io/hirameki-lab/

## 記録とバックアップ

記録はこのブラウザ・この端末のIndexedDBに保存します。6プロフィールの成績を分け、クリアしたステージの最高スターを記録します。サーバーへの記録送信はありません。

「せってい」から6人分の記録をJSONへ書き出せます。別端末では「バックアップを 読み込む」で追加してください。既存記録は残り、同じ記録は重複せず、不正なファイルでは記録を変更しません。バックアップにはプレイ記録のみを含み、音・お気に入りは端末ごとに設定します。ブラウザデータ削除やプライベートブラウズの終了で記録が消える可能性があるため、定期的に書き出してください。

保存失敗時は再試行できます。保存領域が読めなくても、画面に残った未保存記録を書き出せます。その場合は「未保存のきろくだけ」と表示し、過去の保存済み記録を含まないことを案内します。

既存Sites版は別の保存先です。Sites版の記録を自動取得することはありません。

## 開発・検証

DockerとDocker Composeを使用します。Node.js 24、pnpm 11.25.0。

```sh
docker compose run --rm tools install --frozen-lockfile
docker compose up web
# http://localhost:5173/hirameki-lab/
docker compose run --rm tools lint
docker compose run --rm tools typecheck
docker compose run --rm tools test
docker compose run --rm tools audit:stages
docker compose run --rm tools build
```

`audit:stages` は本番の出題APIから全82,090問を再生成し、解答・選択肢・重複・テーマ内の構造スコアの順序を確認します。構造スコアは子どもが感じる難易度や教育効果の実証ではありません。

## 公開

`main` へのpushでGitHub Actionsがlint・型検査・テスト・全問検査・ビルドを実行し、成功したコミットの `dist` のみをGitHub Pagesへ公開します。GitHub Pages設定は「GitHub Actions」を選択します。`vite.config.ts` のbaseは `/hirameki-lab/` です。画面遷移は同一ページ内で行うため、再読み込み時もホームから起動できます。

[移行仕様](docs/migration.md)
