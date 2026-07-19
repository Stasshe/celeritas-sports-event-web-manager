# SPECIFICATION

設計判断の記録。機能一覧はREADME参照、ここには実装の逐一は書かない。不変前提の文書、MVP時点の都合は書かない。

## なぜVite + React SPA(Next.js不採用)

トーナメント表(`@g-loot/react-tournament-brackets`使用、`src/common/TournamentScoring.tsx`)がNext.js環境で正常動作しない。ハード制約であり好みではない。移行検討は不要、この前提のまま拡張すること。

## ディレクトリ3分割の理由

`src/general/` (一般ユーザー向け公開画面) / `src/admin/` (管理画面) / `src/common/` (両方から参照される共有機能) の3分割。

背景: 元は`components/`と`pages/`が admin配下とそれ以外で緩く分かれてるだけで、意図的境界なし。実害2つ:
- `pages/SportPage.tsx`(公開)が`components/admin/scoring/TournamentScoring.tsx`を直接import。public→admin依存の逆転
- admin専用state(`AdminLayoutContext`)が汎用`contexts/`に同居、境界不明瞭

`src/common/`に置く基準: **general/admin両方から実際に使われるもの**だけ。現状該当は トーナメント表機能一式(`TournamentScoring`/`TournamentBuilder`/`TournamentStructureHelper`/`MatchCard`/`MatchEditDialog`/`TeamSelector`/`tournamentViewHelper`)のみ。`TournamentScoring`は`readOnly` propで公開表示/admin編集を切替える設計、コンポーネント自体を分岐させる必要なし。

`src/contexts/`(Auth, Theme)・`hooks/`・`utils/`・`types/`・`config/`は分割対象外。admin専用の`AdminLayoutContext`だけ`src/admin/context/`に個別配置。

## 保存パイプライン

`src/admin/context/AdminLayoutContext.tsx`が admin全体の保存状態の唯一の管理者。

パターン: ページがローカル編集state保持 → リモートデータと乖離検知 → debounce → `useAdminLayout().save(scope)`呼び出し → contextが該当scopeで`registerSaveHandler(handler, scope)`済みのhandlerを実行 → handlerが`useDatabase`経由で実書き込み、成功/失敗をboolean返却。

背景: 以前は各adminページが独自に閉じたautosave実装持ち、`registerSaveHandler`を一切呼ばないページ(EventEditPage, SportEditPage)が存在した。結果、`AdminLayout.tsx`ヘッダーの手動保存ボタン/未保存インジケータがそのページの変更を検知も保存もできなかった。`ScoringPage.tsx`に至っては同一`handleSave`が2箇所コピペされ、2秒debounceと500msdebounceの2系統autosaveが並走(片方はcontext経由、片方は直接呼び出し)。「保存処理が2つ存在してどちらか機能してない」状態が実際に発生していた。

手動保存ボタンの方針: ページヘッダーの「保存」ボタンはEventEditPage/SportEditPage/ScoringPageから削除済み。autosaveと機能重複するボタンは置かない。残すのは:
- `AdminLayoutContext`のfloating「未保存の変更」ボタン — 唯一のグローバル手動trigger、autosave未発火時の保険
- autosaveを持たないページの保存ボタン(AdminPageダッシュボード、AdminSettingsPage) — これが唯一のtriggerなので必要
- モーダルを開くだけのボタン(BackupPanelの「今すぐバックアップ」) — 保存ボタンではなくアクション起動ボタン

新しくadmin編集ページを追加する時はこのパターンに従う。独自autosave書くな、`registerSaveHandler`+`save(scope)`を使え。

## `src/hooks/useDatabase.ts`の書き込み設計

フィールド単位で直接Firebase `update()`。書き込み中は`isUpdatingRef`でリアルタイム`onValue`リスナーからの上書きをブロックする(この guardが無いと書き込み中に飛んでくるsnapshotが楽観的UIを潰し、入力中のちらつき・不安定挙動を起こす — 実際に起きてたバグ)。

過去、バージョン管理・競合検出つきの書き込みキュー(`setData_`/`processUpdateQueue`)が別に実装されてたが、どこからも呼ばれない完全なdead codeだった。削除済み。同種の仕組みを再実装するな — フィールド単位update + `isUpdatingRef`guardが最終形。競合解決の仕組みは意図的に持たない、最後の書き込みが勝つ。

## i18n

react-i18next/i18next 完全撤去済み。文言は全部JSX直書きの日本語。再導入の予定なし。新規コードも直書きでよい、i18nキー方式に戻すな。
