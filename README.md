# Sports Event Web Manager

![バージョン](https://img.shields.io/badge/version-0.1.0-blue)
![ライセンス](https://img.shields.io/badge/license-GPL-green)

## 概要

Sports Event Web Managerは、学校や企業、地域コミュニティなどでのスポーツイベントを効率的に管理するための包括的なウェブアプリケーションです。直感的なユーザーインターフェースを通じて、イベント管理者はスポーツイベントの計画、実行、追跡を簡単に行うことができます。

本システムは、トーナメント形式や総当たり戦などの様々な競技形式に対応し、参加者の登録から結果の記録まで、スポーツイベント管理のあらゆる側面をサポートします。

## 主な機能

### イベント管理
- **イベントの作成・編集・削除**: 日程、場所、説明などの詳細情報を含むイベントの管理
- **代替日程の設定**: 雨天時などの予備日の設定が可能
- **アクティブイベントの指定**: 現在表示したいイベントを設定

### 競技管理
- **複数競技形式のサポート**:
  - トーナメント形式（3位決定戦、敗者復活戦のオプション付き）
  - 総当たり戦（カスタマイズ可能な得点システム）
  - カスタム形式（自由にレイアウト可能）
- **競技ルールとマニュアルの管理**: 各競技ごとに詳細なルールや実施マニュアルを記録

### 参加者管理
- **チーム・選手の登録**: 学年・クラス別の名簿管理
- **担当者の割り当て**: 競技ごとの担当者（リーダー、メンバー）の管理

### スコアリングと結果管理
- **リアルタイムスコア更新**: 試合結果のリアルタイム記録と表示
- **自動順位計算**: 総当たり戦での勝ち点や得失点差に基づく順位の自動計算

### ユーザーインターフェース
- **モダンで直感的なUI**: Material UIを使用した美しく使いやすいインターフェース
- **レスポンシブデザイン**: モバイルからデスクトップまで様々なデバイスに対応
- **アニメーション効果**: Framer Motionによる滑らかな遷移アニメーション
- **多言語対応**: i18nextを使用した国際化対応

## 技術スタック

### フロントエンド
- **React**: UIコンポーネントの構築
- **TypeScript**: 型安全なコード開発
- **Material UI**: モダンなUIコンポーネント
- **Framer Motion**: アニメーション効果
- **React Router**: アプリケーションのルーティング
- **i18next**: 国際化対応

### バックエンド
- **Firebase**: データベース、認証、ホスティング
  - Firestore: リアルタイムデータベース
  - Authentication: ユーザー認証

### 開発ツール
- **React Scripts**: 開発環境の設定
- **ESLint**: コード品質の維持
- **Surge**: 簡易デプロイ

## スクリーンショット

![ダッシュボード](https://example.com/dashboard.png)
![競技管理](https://example.com/sports.png)
![トーナメント表](https://example.com/tournament.png)

## 前提条件

- Node.js (v14以上)
- npm (v6以上)
- Firebase アカウント

## インストール方法

1. リポジトリをクローンします。
   ```bash
   git clone https://github.com/yourusername/sports-event-web-manager.git
   ```

2. プロジェクトディレクトリに移動します。
   ```bash
   cd sports-event-web-manager
   ```

3. 必要な依存関係をインストールします。
   ```bash
   npm install
   ```

4. 環境変数を設定します。
   - `.env.example` ファイルを `.env.local` にコピーします。
   ```bash
   cp .env.example .env.local
   ```
   - Firebase設定情報を `.env.local` ファイルに記入します。

## 使用方法

### 開発モード

1. 開発サーバーを起動します。
   ```bash
   npm start
   ```

2. ブラウザで `http://localhost:3000` にアクセスします。

### 本番ビルド

1. アプリケーションをビルドします。
   ```bash
   npm run build
   ```

2. ビルドされたアプリケーションをプレビューします。
   ```bash
   npm run preview
   ```

### デプロイ

Surgeを使用して簡単にデプロイできます。
```bash
npm run deploy
```

## プロジェクト構造

```
sports-event-web-manager/
├── public/             # 静的ファイル
├── src/                # ソースコード
│   ├── components/     # 再利用可能なコンポーネント
│   ├── contexts/       # Reactコンテキスト
│   ├── hooks/          # カスタムフック
│   ├── i18n/           # 国際化ファイル
│   ├── pages/          # ページコンポーネント
│   ├── types/          # TypeScript型定義
│   └── utils/          # ユーティリティ関数
├── .env.example        # 環境変数の例
└── package.json        # プロジェクト設定
```

## 貢献方法

1. このリポジトリをフォークします。
2. 新しいブランチを作成します (`git checkout -b feature/amazing-feature`)。
3. 変更をコミットします (`git commit -m 'Add some amazing feature'`)。
4. ブランチにプッシュします (`git push origin feature/amazing-feature`)。
5. プルリクエストを作成します。

プルリクエストを送る前に、まずイシューを立てて変更内容について議論することをお勧めします。

## ロードマップ

- [X] モバイルアプリ版の開発
- [X] オフライン機能の強化
- [X] 高度な統計分析機能
- [ ] PDFレポート生成機能

## ライセンス

このプロジェクトはGPLライセンスの下で提供されています。詳細は [LICENSE](LICENSE) ファイルを参照してください。

## お問い合わせ

プロジェクトに関するご質問やフィードバックは、イシューを立てるか、以下の連絡先までお願いします。

- メール: example@example.com
- Twitter: [@sportsEventManager](https://twitter.com/sportsEventManager)

---

© 2025 Sports Event Web Manager Team
