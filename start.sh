#!/bin/bash

# 必要なファイルの存在確認
if [ ! -f "public/logo192.png" ] || [ ! -f "public/logo512.png" ] || [ ! -f "public/favicon.ico" ]; then
  echo "ダミーのロゴファイルを作成しています..."
  node public/createDummyLogos.js
fi

# 依存関係のインストール
echo "npm パッケージをインストールしています..."
npm install

# 開発サーバーの起動（標準のreact-scriptsを使用）
echo "開発サーバーを起動しています..."
npm start

# esbuildを使用する場合は以下のコメントを外してください
# echo "esbuildを使った開発サーバーを起動しています..."
# bash setup-esbuild.sh
# npm run start:esbuild
