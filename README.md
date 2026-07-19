# Sports Event Web Manager

![バージョン](https://img.shields.io/badge/version-1.5.6-blue)
![ライセンス](https://img.shields.io/badge/license-GPL-green)
![言語](https://img.shields.io/badge/TypeScript-6.0-blue)
![フレームワーク](https://img.shields.io/badge/React-18.2.0-61dafb)
![テスト済み](https://img.shields.io/badge/テスト済み-✓-success)

※ちゃんと使えます笑

## 概要

Sports Event Web Managerは、学校や企業、地域コミュニティなどでのスポーツイベントを効率的に管理するための包括的なウェブアプリケーションです。直感的なユーザーインターフェースを通じて、イベント管理者はスポーツイベントの計画、実行、追跡を簡単に行うことができます。

本システムは、トーナメント形式や総当たり戦などの様々な競技形式に対応し、参加者の登録から結果の記録、スケジュール管理、データエクスポートまで、スポーツイベント管理のあらゆる側面をサポートします。

リアルタイムデータ連携機能により、複数のスタッフが同時に作業でき、常に最新の情報が反映されます。また、オフラインモードにも対応しており、インターネット接続が不安定な環境でも使用可能です。

## 主な機能

### イベント管理
- **イベントの作成・編集・削除**: 日程、場所、説明などの詳細情報を含むイベントの管理
- **代替日程の設定**: 雨天時などの予備日の設定が可能
- **アクティブイベントの指定**: 現在表示したいイベントを設定
- **複数表示モード**: グリッド表示、スケジュール表示、タイムライン表示の切り替えが可能
- **アクセス権限管理**: 管理者と一般ユーザーの権限分け

### 競技管理
- **多様な競技形式のサポート**:
  - トーナメント形式（3位決定戦、敗者復活戦のオプション付き）
  - 総当たり戦（カスタマイズ可能な得点システム）
  - リーグ戦（グループステージとプレーオフの組み合わせ）
  - ランキング形式（カスタム基準での順位付け）
  - カスタム形式（自由にレイアウト可能）
- **運営側メモ**: 競技ごとに非公開の運営情報を記録
- **ステータス管理**: 競技ごとに下書き、公開、アーカイブのステータスを設定

### 参加者管理
- **クラス・学年別名簿管理**: 学年とクラス単位での参加者の管理
- **チーム・選手の登録**: チーム単位での参加者登録と管理
- **チームカラー設定**: チームごとの識別色を設定
- **カスタムチーム生成**: 名簿データからチームを自動生成

### 試合・スケジュール管理
- **詳細なスケジュール設定**:
  - コート設定（複数コート対応）
  - 時間枠の管理（試合、休憩、昼食など）
  - 準備時間・片付け時間の設定
- **同時開催試合の管理**: 複数コートでの同時進行試合の表示と管理
- **試合時間の自動計算**: 試合数と利用可能時間から最適な時間配分を算出
- **タイムライン表示**: 全競技を統合したイベント全体のタイムライン

### スコアリングと結果管理
- **リアルタイムスコア更新**: 試合結果のリアルタイム記録と表示
- **試合状況の管理**: 予定、進行中、完了などの試合状態を管理
- **自動順位計算**: 
  - 総当たり戦での勝ち点や得失点差に基づく順位の自動計算
  - カスタム順位付けルールの設定
- **3位決定戦の管理**: トーナメントでの3位決定戦のサポート
- **スコア履歴**: 変更履歴の記録と表示

### データエクスポート機能
- **Excel形式でのエクスポート**: イベントデータを整形されたExcelファイルとして出力
- **カスタマイズ可能な出力内容**:
  - イベント概要シート
  - 競技別結果シート
  - トーナメント表シート
  - 順位表シート
- **ファイル名カスタマイズ**: エクスポートファイルの名前設定が可能

### ユーザーインターフェース
- **モダンで直感的なUI**: Material UIを使用した美しく使いやすいインターフェース
- **レスポンシブデザイン**: モバイルからデスクトップまで様々なデバイスに対応
- **アニメーション効果**: Framer Motionによる滑らかな遷移アニメーション
- **ダークモード**: 明暗テーマの切り替え機能
- **日本語UI**: 画面文言を日本語で統一
- **カスタマイズ可能な表示設定**: ユーザーごとの表示設定の保存

管理画面は、デスクトップでは固定サイドバーと独立スクロール領域、タブレット・モバイルでは一時表示メニューを使います。本文は固定最大幅を設けずワークスペース全体を使い、情報はカードの入れ子ではなく罫線を中心に整理します。

### システム機能
- **自動保存**: 管理画面の編集内容を自動保存、保存状態と手動fallbackを共通管理
- **オフライン編集**: インターネット接続がない環境での編集とオンライン復帰時の同期
- **変更検知**: 未保存の変更がある場合の通知とページ遷移時の警告(admin全体で共通の保存状態管理)
- **ヘルプ機能**: 詳細なヘルプドキュメントと使用方法ガイド

## 使用事例

### 学校の体育祭/スポーツ大会
- 複数の競技種目を一元管理
- クラス対抗戦の結果や順位をリアルタイムで集計・表示
- 教員と生徒会が協力して運営

### 地域スポーツイベント
- 複数会場にまたがる大会の一元管理
- 参加チームやスケジュールの公開・共有
- 結果のリアルタイム更新と閲覧

### クラブ内部リーグ戦
- シーズンを通したリーグ戦の管理
- 詳細な戦績と順位表の自動生成
- メンバー間での情報共有

## 技術スタック

### フロントエンド
- **React 18**: UIコンポーネントの構築とレンダリング
- **TypeScript 6**: 型安全なコード開発
- **Material UI 5.14**: モダンなUIコンポーネントライブラリ
- **React Router 6.15**: SPA内の画面遷移とルーティング
- **Framer Motion**: アニメーション効果
- **ExcelJS**: Excelファイル生成機能

画面はReact Routerのネストルートで一般ユーザー領域と管理領域を分離しています。一般画面は共通のヘッダー・本文・フッターを使用し、`/admin`配下は認証後に管理画面専用レイアウトと状態管理を使用します。トーナメント表示との互換性を保つため、アプリケーションはReact + ViteのSPAとして運用します。画面文言は日本語を直接記述します。

### バックエンド
- **Firebase**: バックエンドサービス
  - **Firestore**: リアルタイムデータベース
  - **Authentication**: ユーザー認証
  - **Storage**: ファイル保存（画像など）
- **React Context API**: アプリケーション状態管理

### 開発・デプロイツール
- **Vite 8**: 開発サーバーと本番ビルド
- **ESLint**: コード品質の維持
- **Surge**: 静的サイトのホスティングとデプロイ
- **pnpm**: パッケージ管理

## スクリーンショット

![ダッシュボード](https://example.com/dashboard.png)
*管理パネルのダッシュボード画面 - イベント統計と最近の更新を表示*

![競技管理](https://example.com/sports.png)
*競技管理画面 - 各競技の詳細設定と結果管理*

![トーナメント表](https://example.com/tournament.png)
*トーナメント表示画面 - 試合結果と進行状況の視覚化*

![スケジュール表示](https://example.com/schedule.png)
*タイムライン表示 - イベント全体のスケジュールを時系列で表示*

## インストール・設定ガイド

### 前提条件

- Node.js 20.19以上
- pnpm 11以上
- Firebase アカウント

### インストール手順

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
   pnpm install
   ```

4. Firebase設定を行います。
   - Firebaseコンソールで新しいプロジェクトを作成
   - Authentication、Firestore、Storageを有効化
   - Webアプリケーションを登録し、設定情報を取得

5. 環境変数を設定します。
   - `.env.example` ファイルを `.env.local` にコピーします。
   ```bash
   cp .env.example .env.local
   ```
   - Firebase設定情報を `.env.local` ファイルに記入します。
   ```
   VITE_FIREBASE_API_KEY=your-api-key
   VITE_FIREBASE_AUTH_DOMAIN=your-auth-domain.firebaseapp.com
   VITE_FIREBASE_DATABASE_URL=https://your-database.firebaseio.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-storage-bucket.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
   VITE_FIREBASE_APP_ID=your-app-id
   ```

   デプロイ環境にも同じ変数名を設定します。値は既存のFirebaseプロジェクトとRealtime Databaseを指すものを維持してください。

   必須変数の不足またはFirebase初期化失敗時は、空白画面ではなく設定エラー画面が表示されます。開発環境では表示された変数を`.env.local`へ追加し、開発サーバーを再起動してください。

6. Firebaseセキュリティルールを設定します。
   - `firebaseRules.json`の内容をFirebaseコンソールのSecurityルールセクションに適用

### 開発環境の利用

1. 開発サーバーを起動します。
   ```bash
   pnpm dev
   ```

2. ブラウザで `http://localhost:3001` にアクセスします。

3. 初回ログイン時に管理者アカウントを作成します。

### テスト

```bash
pnpm test
```

開発中の監視実行は `pnpm test:watch`。トーナメント構造、シード、3位決定戦、リーグ順位参照、1/2コート配置、休憩境界、順序維持リスケをVitestで検証する。

### 本番環境用ビルド

1. アプリケーションをビルドします。
   ```bash
   pnpm build
   ```

2. ビルドされたアプリケーションをプレビューします。
   ```bash
   pnpm preview
   ```

### デプロイ方法

#### Surgeを使用したデプロイ

1. Surgeがインストールされていることを確認します。
   ```bash
   pnpm add --global surge
   ```

2. デプロイコマンドを実行します。
   ```bash
   pnpm deploy
   ```

#### Firebase Hostingを使用したデプロイ

1. Firebase CLIをインストールします。
   ```bash
   pnpm add --global firebase-tools
   ```

2. Firebaseにログインします。
   ```bash
   firebase login
   ```

3. プロジェクトを初期化します。
   ```bash
   firebase init hosting
   ```

4. デプロイを実行します。
   ```bash
   firebase deploy --only hosting
   ```

## 使用方法ガイド

### 管理者向け

#### イベント管理
1. 管理パネルにログインし、「イベント管理」セクションを開きます。
2. 「新規イベント作成」ボタンをクリックし、必要情報を入力します。
3. イベントリストから編集したいイベントを選択し、詳細を更新します。
4. 「アクティブに設定」ボタンを押して、現在表示するイベントを設定します。

#### 競技管理
1. アクティブイベント内で「競技管理」セクションを開きます。
2. 「競技追加」ボタンから新しい競技を追加します。
3. 競技タイプ（トーナメント、総当たり戦など）を選択します。
4. 必要に応じて運営側メモを入力します。
5. 名簿タブでクラス・チーム情報を登録します。
6. スケジュールタブで時間枠や会場設定を行います。

#### 試合結果管理
1. 管理する競技の「スコアリング」ページを開きます。
2. 試合カードから結果を入力または更新します。
3. トーナメントの場合、勝者は自動的に次の試合に進みます。
4. 総当たり戦の場合、順位表が自動的に更新されます。

#### データエクスポート
1. 「データエクスポート」セクションを開きます。
2. エクスポートするイベントを選択します。
3. 出力オプションを設定します。
4. 「Excelにエクスポート」ボタンをクリックしてダウンロードします。

### 一般ユーザー向け

#### イベント閲覧
1. ホームページでイベント情報を確認します。
2. 表示モードを切り替えて、グリッド、スケジュール、タイムラインで閲覧できます。

#### 競技情報確認
1. 競技カードをクリックして詳細ページを開きます。
2. 試合タブで結果や進行状況を確認します。

#### スケジュール確認
1. スケジュール表示またはタイムライン表示に切り替えます。
2. イベント全体のスケジュールを時系列で確認できます。
3. 競技ごとのタイムスロットと会場情報を参照できます。

## 機能詳細

### トーナメント機能
- **自動ブラケット生成**: チーム数に基づいた最適なトーナメント表を生成
- **シード処理**: 参加数が2の累乗でない場合、不戦勝を試合枠へ入れず自動進出
- **3位決定戦**: 準決勝敗者同士の3位決定戦をオプションで設定可能
- **敗者復活戦**: トーナメントに敗者復活の仕組みを追加可能
- **マッチID管理**: 各試合に一意のIDを割り当て、追跡を容易に

### 総当たり戦機能
- **自動試合生成**: 参加チーム数に基づいた総当たり戦の試合表を自動生成
- **カスタム得点システム**: 勝ち点、引き分け点、負け点をカスタマイズ可能
- **複数順位決定方法**: 勝ち点、得失点差、総得点などから順位決定方法を選択
- **同点時の処理**: 同点の場合の順位決定ルールを設定

### スケジュール管理機能
- **タイムスロット管理**: 時間枠を細かく設定し、試合や休憩を割り当て
- **コート/会場管理**: 複数のコートや会場を設定し、並行して試合を実施
- **自動スケジュール生成**: 試合数と利用可能な時間から最適なスケジュールを提案
- **進行連動表示**: 未確定枠を前試合の勝敗・ブロック順位で表示し、確定後はチーム名へ更新
- **順序維持リスケ**: 現在の試合順を保ったまま時間設定を再適用
- **競合検出**: 同一チームの同時刻試合など、スケジュール上の競合を検出
- **視覚的タイムライン**: 時系列でイベント全体を視覚化

## プロジェクト構造

```
sports-event-web-manager/
├── public/                            # 静的asset、icon、manifest
├── src/
│   ├── general/                       # 公開領域
│   │   ├── pages/
│   │   │   ├── ClassSchedulePage.tsx
│   │   │   ├── HomePage.tsx
│   │   │   ├── LoginPage.tsx
│   │   │   ├── NotFoundPage.tsx
│   │   │   ├── ScoreboardDetailsPage.tsx
│   │   │   └── SportPage.tsx
│   │   └── components/
│   │       ├── schedule/
│   │       │   ├── ClassScheduleTimeline.tsx
│   │       │   └── ClassSelector.tsx
│   │       ├── scoreboard/
│   │       │   └── OverallScoreCard.tsx
│   │       ├── sports/
│   │       │   ├── EventOverallTimeline.tsx
│   │       │   ├── EventTimelineOverview.tsx
│   │       │   ├── RoundRobinTable.tsx
│   │       │   └── ScheduleTimeline.tsx
│   │       ├── DelaysTable.tsx
│   │       └── PublicLayout.tsx
│   ├── admin/                         # 管理領域
│   │   ├── pages/
│   │   │   ├── AdminPage.tsx
│   │   │   ├── AdminSettingsPage.tsx
│   │   │   ├── BackupPage.tsx
│   │   │   ├── EventEditPage.tsx
│   │   │   ├── ExportPage.tsx
│   │   │   ├── ScoringPage.tsx
│   │   │   └── SportEditPage.tsx
│   │   ├── components/
│   │   │   ├── dialogs/
│   │   │   │   ├── CreateEventDialog.tsx
│   │   │   │   ├── CreateSportDialog.tsx
│   │   │   │   └── DeleteConfirmationDialog.tsx
│   │   │   ├── scheduling/
│   │   │   │   ├── ManualScheduleEditor.tsx
│   │   │   │   ├── ScheduleTab.tsx
│   │   │   │   └── TimeSlotTable.tsx
│   │   │   ├── scoreboard/
│   │   │   │   └── OverallScoreTab.tsx
│   │   │   ├── scoring/
│   │   │   │   ├── helpers/
│   │   │   │   │   ├── LeagueMatchHelper.ts
│   │   │   │   │   └── LeaguePlayoffHelper.ts
│   │   │   │   ├── LeagueScoring.tsx
│   │   │   │   ├── RankingScoring.tsx
│   │   │   │   └── RoundRobinScoring.tsx
│   │   │   ├── AdminLayout.tsx
│   │   │   ├── BackupPanel.tsx
│   │   │   ├── ExportPanel.tsx
│   │   │   ├── ProtectedRoute.tsx
│   │   │   ├── RosterEditor.tsx
│   │   │   └── TabContent.tsx
│   │   └── context/
│   │       └── AdminLayoutContext.tsx
│   ├── common/                        # 公開・管理共有のトーナメント機能
│   │   ├── MatchCard.tsx
│   │   ├── MatchEditDialog.tsx
│   │   ├── TeamSelector.tsx
│   │   ├── TournamentBuilder.tsx
│   │   ├── TournamentScoring.tsx
│   │   ├── TournamentStructureHelper.ts
│   │   └── tournamentViewHelper.ts
│   ├── config/
│   │   └── firebase.ts
│   ├── contexts/                      # 全体共有context
│   │   ├── AuthContext.tsx
│   │   └── ThemeContext.tsx
│   ├── hooks/
│   │   ├── useBackup.ts
│   │   ├── useClassSchedule.ts
│   │   └── useDatabase.ts
│   ├── types/
│   │   ├── index.ts
│   │   ├── react-color.d.ts
│   │   └── tournament-brackets.d.ts
│   ├── utils/
│   │   ├── export/
│   │   │   ├── ExportManager.ts
│   │   │   ├── LeagueExporter.ts
│   │   │   ├── RankingExporter.ts
│   │   │   ├── RoundRobinExporter.ts
│   │   │   └── TournamentExporter.ts
│   │   ├── labels.ts
│   │   └── scheduleGenerator.ts
│   ├── App.tsx
│   ├── index.tsx
│   └── vite-env.d.ts
├── index.html                         # HTML entry point
├── .env.example            # 環境変数の例
├── package.json            # プロジェクト設定
└── tsconfig.json           # TypeScript設定
```

## カスタマイズガイド

### テーマのカスタマイズ
Sports Event Web Managerは、Material UIのテーマシステムを利用しており、アプリケーション全体の外観を簡単にカスタマイズできます。

1. `src/contexts/ThemeContext.tsx`を編集してテーマ設定を変更します。
2. プライマリカラー、セカンダリカラー、フォントなどを調整できます。
3. ダークモードのカラーパレットも同様に設定可能です。

## パフォーマンスとベストプラクティス

### メモリ使用量の最適化
- **React.memo()**: 頻繁に再レンダリングされるコンポーネントには`React.memo()`を使用します。
- **useCallback/useMemo**: 関数や計算コストの高い値の再生成を防ぐためにこれらのフックを使用します。
- **レンダリングの最適化**: 大きなリストには仮想化（react-window/react-virtualized）を検討してください。

### データ取得とキャッシュ
- **リアルタイム更新とポーリングの併用**: 重要なデータのみリアルタイム監視し、それ以外は必要に応じて取得します。
- **データキャッシュ**: 一度取得したデータはローカルでキャッシュし、不必要な再取得を避けます。
- **楽観的UI更新**: 保存前にUIを先に更新し、ユーザーエクスペリエンスを向上させます。

### セキュリティ対策
- **入力検証**: すべてのユーザー入力はクライアント側とサーバー側の両方で検証します。
- **認証と権限**: Firebase Authenticationを使用してユーザー認証を処理し、適切な権限管理を行います。
- **セキュリティルール**: Firestoreのセキュリティルールを適切に設定し、権限のないアクセスを防止します。

## 貢献方法

Sports Event Web Managerはオープンソースプロジェクトであり、コミュニティからの貢献を歓迎します。

### 貢献のステップ
1. このリポジトリをフォークします。
2. 新しいブランチを作成します (`git checkout -b feature/amazing-feature`)。
3. 変更をコミットします (`git commit -m 'Add some amazing feature'`)。
4. ブランチにプッシュします (`git push origin feature/amazing-feature`)。
5. プルリクエストを作成します。

### 開発ガイドライン
- **コーディング規約**: ESLintとPrettierの設定に従ってコードを整形してください。
- **コミットメッセージ**: 明確で説明的なコミットメッセージを使用してください。
- **テスト**: 生成規則や不具合修正には境界値を含むVitestテストを追加する。
- **ドキュメント**: 新機能を追加した場合は、対応するドキュメントも更新してください。

プルリクエストを送る前に、まずイシューを立てて変更内容について議論することをお勧めします。

## ロードマップ

### 短期目標
- [X] モバイル表示の最適化
- [X] オフライン機能の強化
- [X] データエクスポート機能の拡張
- [X] タイムライン表示の改善

### 中期目標
- [ ] PDF形式のレポート生成機能
- [ ] 画像アップロード機能の強化
- [ ] チーム/選手の詳細プロファイル
- [ ] 統計分析ダッシュボード

### 長期目標
- [ ] 観客向けリアルタイム結果表示アプリ
- [ ] API連携による外部システムとの統合
- [ ] 機械学習を活用した試合予測
- [ ] モバイルアプリ版の開発

## よくある質問 (FAQ)

### 一般的な質問
**Q: このアプリケーションは無料で使用できますか？**  
A: はい、Sports Event Web Managerはオープンソースで提供されており、無料で使用できます。ただし、Firebase等のバックエンドサービスの使用には料金が発生する場合があります。

**Q: オフラインでも使用できますか？**  
A: はい、基本的な機能はオフラインでも使用できます。インターネット接続が復旧すると、変更は自動的に同期されます。

### 技術的な質問
**Q: カスタムデータベースを使用できますか？**  
A: はい、Firebase Firestoreの代わりに他のデータベースを使用するようにコードを修正できます。`src/hooks/useDatabase.ts`を変更してください。

**Q: 同時編集による競合はどう処理されますか？**  
A: 競合解決の仕組みはない。Firebase RTDBへの直接書き込みで同一fieldは最後の書き込みが勝つ。複数人で同一イベント/競技を同時編集する運用は避けること。

## ライセンス

このプロジェクトはGNU General Public License v3.0（GPLv3）の下で提供されています。詳細は [LICENSE](LICENSE) ファイルを参照してください。

## お問い合わせ

プロジェクトに関するご質問やフィードバックは、イシューを立てるか、以下の連絡先までお願いします。

- mail2: eterynity2024workplace@gmail.com

## 謝辞

このプロジェクトは以下のオープンソースプロジェクトに支えられています：
- React、Material UI、TypeScript
- Firebase、ExcelJS
- Framer Motion

---

© 2025 Sports Event Web Manager Developer, Stassshe-Roughfts
