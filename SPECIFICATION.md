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
