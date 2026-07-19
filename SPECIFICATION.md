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

イベント説明は入力中の改行を公開トップで保持。進行差分数は正数を遅延、負数を前倒しとし、管理画面と公開表示で同じ値を使う。

## 管理保存

### 状態と実行経路

`src/admin/context/AdminLayoutContext.tsx`、管理保存coordinator。scope別handler、timer、revision、直列write、未保存状態、共通feedback所有。自動保存delayは800msで統一する。編集画面、モーダルから反映される編集、ともに同じdebounceを使う。作成、削除、同期は確定操作のため対象外。

保存契約:

1. pageがlocal edit state保持
2. `useAutoSave(scope, handler)`がhandler登録と解除を所有
3. edit handlerがlocal state更新後に`schedule()`呼出
4. coordinatorが同scopeのtimerを置換し、800ms後に最新handler実行
5. handlerが`useDatabase`経由でwrite、成功可否を`boolean`返却
6. 保存中の再編集はrevisionで識別。古いwrite完了ではdirtyを解除せず、scope内writeを直列化

`EventEditPage.tsx`、`SportEditPage.tsx`、`ScoringPage.tsx`は同一契約。page固有timerと即時writeを持たない。

### Background

保存action Contextと保存表示state Contextを分離。編集componentはstatus変更を購読せず、header内の保存表示だけ更新する。保存feedbackに進捗intervalを使わない。

### 保存表示policy

`EventEditPage.tsx`、`SportEditPage.tsx`、`ScoringPage.tsx`のpage header保存button、置かない。autosaveと同じwriteの重複入口になるため。

自動保存の未保存・保存中・保存済み・失敗表示は管理header右上だけに置く。floating通知は置かない。`AdminPage` dashboardと`AdminSettingsPage`はautosaveなし。`BackupPanel`はpage edit保存でなく独立したbackup作成action。

## Firebase write

Firebase必須環境変数を起動時に検証する。設定不足またはSDK初期化失敗時、通常のrouteとdata hookを開始せず、原因を示す全画面エラーを表示する。render時の未処理例外もroot error boundaryで捕捉し、再読み込み可能なエラー画面へ切り替える。空白画面のまま停止させない。

`src/hooks/useDatabase.ts`の更新、Firebase RTDB `update()`一回による複数fieldのatomic write。transaction、server-side version追跡、競合解決layerなし。複数client同一field編集、last-write-wins。

競技編集画面にlocal/remote差分表示、リモート値採用操作、最終同期表示を持たない。保存状態は管理headerへ集約する。

write中`isUpdatingRef`を立て、`onValue` snapshotによるin-flight optimistic state上書き防止。実際に起きた表示flicker・編集不安定を止めるguard。旧version-tracking/conflict-detection系、完成していたが呼ばれないparallel write pathだったため削除済み。復活禁止。multi-field atomic `update()` + in-flight guard、意図した最終設計。

## UI言語

i18n廃止。全UI文字列、JSXへ日本語直接記述。`i18next`、`react-i18next`、翻訳resource、language selector再導入しない。

## 試合構造とスケジュール

`Sport.matches`が対戦構造の正本。後続枠はチームらしき仮IDを保存せず、`team1Source`、`team2Source`へ前試合の勝者・敗者またはブロック順位を保存する。シードは片側にチームまたは参照がなく、反対側だけ存在する1回戦。不戦勝枠を実施スケジュールへ含めない。手動編集時、上段の候補はチームだけ、下段の空値候補は「シード」と表示する。

3位決定戦は決勝と同じround、`matchNumber: 0`。メインと負け側で独立してON/OFFし、各ブラケットの準決勝敗者を参加元にする。メインは`third_place_match`、負け側は`consolation_third_place_match`と`bracket`で分離し、対応する表の直下へ表示する。メイン3位決定戦の参加元は負け側トーナメントへ重複参加させない。リーグのプレーオフ初戦は、未確定ならブロック順位参照、順位確定後に同じ試合へ実チームIDを反映する。

負け側トーナメントは`bracket: "consolation"`でメイン表と分離。参加元は実施される1回戦の敗者参照、設定時は2回戦の敗者参照も含む。ただし3位決定戦の参加元は重複させない。以降は負け側前試合の勝者参照。未確定参加者を仮チームIDで保存しない。

`TimeSlot`は時刻、コート、`matchId`の割当を所有。対戦名は保存済みdescriptionを正本にせず、対応試合があれば現在の`Sport.matches`から解決、手動追加など対応試合がなければTimeSlotの対戦名を表示する。通常の再生成はラウンド制約内でシャッフル。「順番を維持してリスケ」は既存TimeSlotのmatchId順を入力順として時間設定だけ再適用する。手動行入れ替えは、行と時刻を一緒に移動するモードと時刻を位置に残すモードを選択する。

同時刻の複数コートへ同一チームを重複配置しない。直前枠への連続出場は許可し、開始時刻は試合時間と試合間休憩の一定刻みを保つ。負け側を含む後続試合は全参加元試合の後に配置する。

`ScheduleSettings.excludedMatchIds`で生成対象外試合を指定。コート数は生成前に1または2から選択。終了時刻を超えるのに未生成試合が残る場合、通常は一部を黙示的に欠落させず生成失敗として通知。`allowEndTimeOverrun`時は全対象試合の配置完了まで生成を継続する。

クラス別スケジュールは確定済み参加者だけでなく、前試合の勝者・敗者参照と未確定ブロック順位から到達可能なチームも抽出対象にする。保存済みTimeSlotのない試合時刻は推測しない。

## 自動テスト

Vitest、Node環境。生成規則はUIを介さない純粋関数を正本として検証し、component内へ同じ生成ロジックを複製しない。必須境界はチーム数1・2・2の累乗前後、シード進出先、3位決定戦の準決勝敗者参照、負け側の参加元と依存順、リーグ終了前後の順位参照、1/2コートの同時配置とチーム競合、ラウンド依存、休憩の半開区間境界、時間不足と超過許可、対象外試合、順序維持リスケ、行入れ替えの時刻保持。
