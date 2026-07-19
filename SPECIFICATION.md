# SPECIFICATION

## 実行基盤

Vite + React 18 SPA固定。Next.js移行禁止。`@g-loot/react-tournament-brackets`のトーナメント表描画、Next.js環境と非互換。選好でなく制約。

画面遷移、公開領域、管理領域ともReact Router v6管理。server rendering前提の構造へ寄せない。

## Source ownership

- `src/general/`: 公開画面と公開専用component。閲覧者向け表示責務
- `src/admin/`: 管理画面、管理専用component、管理保存状態。認証後の編集責務
- `src/common/`: 公開・管理双方が実際にconsumeする機能だけ配置
- `src/contexts/`: application全体の横断状態。`AuthContext`、`ThemeContext`のみ
- `src/hooks/`, `src/utils/`, `src/config/`, `src/types/`: domain非依存の共有layer

`src/common/`昇格条件、再利用可能そうかでなく公開・管理双方から現に使うか。現在対象、トーナメント表一式。`TournamentScoring.tsx`の`readOnly`で公開表示と管理編集切替。同じbracket model・描画を二重実装させない。

背景、旧構造では公開`SportPage.tsx`が管理側のトーナメントcomponentをimportし、公開→管理の依存逆転発生。管理専用`AdminLayoutContext`も全体用`src/contexts/`に混在。3領域分割、依存方向とstate ownershipを一致させるため。

## 管理UI

`md`以上、固定幅サイドバーと独立スクロールするワークスペースの2領域。`md`未満、サイドバーを一時表示Drawerへ切替。ワークスペースヘッダーは同領域内sticky配置。固定ヘッダーと本文offsetの別管理禁止。

管理ページ外周余白は共通layoutが所有。個別pageの`Container`はgutterと最大幅制限を重ねない。反復情報は罫線で分割し、独立操作単位でない表示をCard化しない。操作、状態、本文の優先順を保ち、狭幅では横並びを縦積みへ変える。

競技固有の運営情報は、管理画面だけに表示する`operationsNote`へ集約。公開画面へ表示しない。ルール、マニュアル、担当者の項目と専用画面は持たない。

## 管理保存

### 状態と実行経路

`src/admin/context/AdminLayoutContext.tsx`、管理保存状態のsingle source of truth。`savingStatus`、`hasUnsavedChanges`、scope別handler、共通feedback所有。

保存契約:

1. pageがlocal edit state保持
2. pageが変更検知。debounce、tab遷移、即時保存など画面操作に合う時点で`useAdminLayout()`の`save(scope)`呼出
3. pageが`useEffect`内で`registerSaveHandler(handler, scope)`登録、cleanupで解除
4. contextがscope対応handler実行
5. handlerが`useDatabase`経由でwrite、成功可否を`boolean`返却

`EventEditPage.tsx`、local/remote差分を1秒debounce。`ScoringPage.tsx`、編集を2秒debounce。`SportEditPage.tsx`、同じscope handlerへtab遷移・離脱時保存、一部field編集は`updateData()`即時実行。trigger差あっても保存状態とfallback入口はcontextへ集約。

### Background

旧構造、各page独立autosave。context未登録だったため`AdminLayout.tsx` headerの未保存表示とglobal save経路、page実処理へ接続なし。`ScoringPage.tsx`には同一save function二重実装、競合するautosave timer二本存在。scope登録方式でglobal状態と実write接続、保存関数一系統化。

### 手動保存policy

`EventEditPage.tsx`、`SportEditPage.tsx`、`ScoringPage.tsx`のpage header保存button、置かない。autosaveと同じwriteの重複入口になるため。

残すmanual affordance:

- `AdminLayoutContext`のfloating「未保存の変更」button: 全scope共通fallback trigger
- `AdminPage` dashboard、`AdminSettingsPage`: autosaveなしのpage
- `BackupPanel`: page edit保存でなく独立したbackup作成action

## Firebase write

`src/hooks/useDatabase.ts`の更新、Firebase RTDB `update()`によるfield-level write。transaction、version追跡、競合解決layerなし。複数client同一field編集、last-write-wins。

write中`isUpdatingRef`を立て、`onValue` snapshotによるin-flight optimistic state上書き防止。実際に起きた表示flicker・編集不安定を止めるguard。旧version-tracking/conflict-detection系、完成していたが呼ばれないparallel write pathだったため削除済み。復活禁止。field-level `update()` + in-flight guard、意図した最終設計。

## UI言語

i18n廃止。全UI文字列、JSXへ日本語直接記述。`i18next`、`react-i18next`、翻訳resource、language selector再導入しない。

## 試合構造とスケジュール

`Sport.matches`が対戦構造の正本。後続枠はチームらしき仮IDを保存せず、`team1Source`、`team2Source`へ前試合の勝者・敗者またはブロック順位を保存する。シードは片側にチームまたは参照がなく、反対側だけ存在する1回戦。不戦勝枠を実施スケジュールへ含めない。

3位決定戦は決勝と同じround、`matchNumber: 0`。両参加枠は2つの準決勝敗者参照。リーグのプレーオフ初戦は、未確定ならブロック順位参照、順位確定後に同じ試合へ実チームIDを反映する。

`TimeSlot`は時刻、コート、`matchId`の割当を所有。対戦名は保存済みdescriptionを正本にせず、表示時に現在の`Sport.matches`から解決する。通常の再生成はラウンド制約内でシャッフル。「順番を維持してリスケ」は既存TimeSlotのmatchId順を入力順として時間設定だけ再適用する。

## 自動テスト

Vitest、Node環境。生成規則はUIを介さない純粋関数を正本として検証し、component内へ同じ生成ロジックを複製しない。必須境界はチーム数1・2・2の累乗前後、シード進出先、3位決定戦の準決勝敗者参照、リーグ終了前後の順位参照、1/2コートの同時配置とチーム競合、ラウンド依存、休憩の半開区間境界、時間不足エラー、順序維持リスケ。
