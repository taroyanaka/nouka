# Farm Defense テスト仕様・照合基準

## 目的

このファイルは、AIがテスト仕様、テスト実装、実際の実行結果の差異を確認するための基準である。

AIは次の3種類のデータを照合する。

1. テスト関連ファイル（`test.html`、`test.js`、テスト用フックを含む`script.js`、`trap.js`）
2. この`TEST.md`に定義されたテスト仕様
3. `test-log*.json`に保存された実行結果のうち、`generatedAt`が最も新しいもの

`test-log.json`、`test-log (1).json`、`test-log (2).json`のように候補が複数ある場合は、各JSONの`generatedAt`をISO 8601日時として比較し、最も新しい有効なログを採用する。ファイル名やFinder上の更新日時は判定に使わない。JSONとして読めない候補は除外し、有効な候補がない場合はログ未確認として扱う。

## 実行方法

サーバーは起動しない。Chromeでプロジェクト内の`test.html`を直接開く。

1. `/Users/taroyanaka/Downloads/nouka8/test.html`をダブルクリックする。
2. ページ読み込み時に`test.js`がテストを自動実行する。
3. 結果は画面の`test-output`とChromeの`localStorage`へ保存される。
4. テスト終了後、「ログを保存」ボタンを押す。
5. ダウンロードされたログをプロジェクト直下へ保存する。Chromeが`test-log (1).json`、`test-log (2).json`のように別名保存した場合も、そのまま候補として扱う。

`test.html`は`param.js`、`trap.js`、`script.js`、`test.js`を同じディレクトリから読み込むため、直接開いた場合もテストを開始できる。テストログの自動ファイル上書きはブラウザのセキュリティ制約でできないため、最後の置き換えだけ手動で行う。

### 実行結果の確認

1. 画面上部のログ欄の末尾に`event":"test_end"`が表示されるまで待つ。
2. `test_end`の`status`が`passed`で、`actual.failures`が`0`であることを確認する。
3. `assertion_failed`が1行でもある場合は失敗であり、`scenarioId`、`label`、`expected`、`actual`を確認する。
   シナリオ実行数が想定値と異なる場合も、`scenario_count`という`assertion_failed`が記録され、失敗になる。
4. 画面を再読み込みするとテストは最初から再実行される。古いログと混同しないよう、再読み込み後の末尾の`test_end`だけを採用する。

### ログ保存の具体手順

1. テスト終了後、画面の「ログを保存」ボタンを押す。
2. Chromeのダウンロード先にあるログをプロジェクト直下へ保存する。
3. 各`test-log*.json`をJSONとして開き、`status`、`generatedAt`、`totalFailures`、`logs`が存在することを確認する。
4. `generatedAt`を比較し、最も新しい有効なファイルを今回の実行結果として採用する。
5. AIが照合するときは、採用したファイル名と`generatedAt`を明示し、古い候補を結果判定に使用しない。

テスト結果は`farm-defense-test-log`というキーで`localStorage`にも保存される。保存ボタンはこの値をJSONファイルとして出力する。`localStorage`が利用できない場合でも画面ログは表示されるが、保存ボタンで出力されるのはその実行中の結果となる。

### テストの具体的な範囲

`test.js`はページ読み込み時に次の順でシナリオを実行する。

1. 敵の基本定義・生成・移動
2. 敵能力（回復、オーラ、Shieldmaster防御）
3. 罠の射程・対象選択
4. 罠の8効果と効果時間（設定値は秒、1xでは1秒=60更新）
5. 罠タイプと罠効果の組み合わせ（単一効果・複数効果の実発動を含む）
6. 基本バフ・拡張バフの定義適用
7. バフの実効値
8. 敵定義値、レギュレーション難易度の初期資金・Wave敵表、9マップのスポーン、BFS経路探索、再経路計算、畑攻撃・破壊
9. Wave出現数・ラウンドロビン・終了判定
10. 罠の境界、クールダウン、耐性、ダメージ間隔、設置検証
11. 同一シードの再現性とWaveタイマー
12. ゲーム進行速度の切替（2x/4x/8x/16x）
13. 横長マップの寸法、左端スポーン、右方向への敵移動、Canvasの1440×720（2倍表示）

各シナリオは`test.js`の`runScenario`から初期化され、必要なフレーム数だけ`api.step()`で更新される。敵定義14件、罠・敵能力・Wave・経路・バフ定義適用103件などをループで展開するため、ソース中のシナリオIDリテラル数と実行件数は一致しない。現在の実行予定件数は187件で、`test.js`の`expectedScenarioCount`も187である。実行時はログの`scenario_end`件数が187件であることを確認する。

設定仕様として、起動時に全レギュレーション・全難易度・全Waveを検証する。未記載Wave、空オブジェクト、未知の敵ID、`CONFIG.maxWave`超過、Wave合計0体は起動エラーになる。スプライト設定は共通で、URI、1インデックスの切り出し開始位置（`sx` / `sy`）、切り出しサイズ、描画サイズ、基準点、アニメーション、反転、フォールバックの各項目を保持できる。罠定義には任意の` sprite `オブジェクトを持たせ、共通の`trap`設定を上書きできる。レギュレーションで追加した罠も個別スプライトを使用できる。レギュレーション切り替えでは編集内容を保持しつつゲームをリセットし、テックツリー選択状態を初期化する。

罠タイプと罠効果の組み合わせは、定義だけを検証せず、`placeTrapDefinition()`で実際に罠を設置して1フレーム更新する。既存の単一効果ケースに加え、単一効果と複数効果を別シナリオとして確認する。

## 最新実行結果（2026-09-16）

Chromeで`test.html`を直接開いてテストを自動実行し、保存された最新ログ`test-log (1).json`を確認した。

- `generatedAt`: `2026-09-16T09:23:59.383Z`
- `status`: `passed`
- `totalFailures`: `0`
- `failedAssertionCount`: `0`
- `scenarioCount`: `187` / `expectedScenarioCount`: `187`
- `scenario_end`: `187`件
- `test_end`: `status: passed`, `actual.failures: 0`

今回追加したコインプッシャー型の初期罠6種（tileの`slow`、`poison`、`burn`、`armor_down`、lineの`pull`、`knockback`）について、罠定義の件数・ID・効果種別・価格の検証も成功した。保存した最新ログ`test-log (1).json`の実行結果を採用した。

横長レイアウト検証では、グリッドが30列×15行であること、straightマップの入口が左端・基地が右端であること、Canvasが1440×720であること、敵のx座標が更新後に増加することを確認した。1タイルは48pxで、従来の横長マップから見た目上2倍である。

## AIから操作して実行する方法

AIはChromeのブラウザ操作機能を使い、次の手順で実行する。サーバーは起動しない。

1. `file:///Users/taroyanaka/Downloads/nouka8/test.html`をChromeで開く。
2. ページ読み込み完了後、`#test-output`が存在することを確認する。
3. `#test-output`の末尾が`event":"test_end"`になるまで待つ。
4. 末尾の`status`が`passed`、`actual.failures`が`0`であることを確認する。
5. ログ全体から`assertion_failed`を検索し、存在する場合は失敗扱いにする。
6. `#save-log`ボタンをクリックする。
7. Chromeのダウンロード先のログをプロジェクト直下へ保存する。`test-log (1).json`や`test-log (2).json`のような別名でもよい。
8. プロジェクト直下の全`test-log*.json`を調べ、JSON内の`generatedAt`が最も新しい有効なファイルを採用する。
9. 採用したJSONの`status`、`generatedAt`、`totalFailures`、`failures`、`logs`を検証する。採用したファイル名と日時も記録する。

### AIが使用できるテストAPI

テストページが読み込まれた後は、`window.__TEST_API__`を状態確認と失敗再現に使用できる。通常の`index.html`ではこのAPIが存在しないことも確認する。

- `setSeed(seed)`: 決定的な乱数系列を設定
- `setSpeed(value)` / `getSpeed()`: ゲーム進行速度を設定・取得（1/2/4/8/16）
- `reset(options)`: マップ、難易度、障害物率を指定して初期化
- `step(frames)`: 指定フレーム数だけ手動更新
- `getState()`: 現在のゲーム状態を取得
- `spawnEnemy(id, x, y)`: 敵を指定座標へ生成
- `placeTrap(id, x, y)`: 定義済み罠を設置
- `placeTrapDefinition(definition, x, y)`: テスト用罠定義を設置
- `tryPlaceTrapDefinition(definition, x, y)`: 例外にせず設置可否を返す
- `setWaveActive(value)`: Wave中フラグを設定
- `setDifficultyConfig(level, config)` / `setWaveConfig(config)`: 難易度・次Wave設定を差し替え
- `setMaxWave(value)`: 最大Waveを差し替え
- `blockCell(x, y, value)` / `findPath(sx, sy, tx, ty)`: 障害物と経路探索を操作
- `tryStartWave()` / `startWave()`: Wave開始と開始前後状態の取得
- `applyBuff(id)`: バフを適用
- `placeBuilding(type, x, y)` / `placeFarm(x, y)` / `removeAllFarms()`: テスト用建築・畑操作
- `setEnemyHp(index, hp)` / `setEnemyDamage(index, damage)` / `damageEnemy(index, damage, sourceX, sourceY)`: 敵状態・被ダメージ操作
- `getBuffMetrics()`: 基本バフの実効倍率を取得
- `getDefinitions()`: 敵、罠、バフの定義を取得

個別ケースを再現するときは、シード、`reset`の引数、API操作、`step`のフレーム数、操作前後の`getState()`を記録する。

### AI操作時の失敗条件

- `#test-output`が存在しない
- `test_end`が一定時間内に出ない
- `test_end.status`が`failed`
- `actual.failures`が0以外
- `assertion_failed`が存在する
- `scenario_end`の件数が、`test.js`内の`expectedScenarioCount`（187）と一致しない
- 有効な`test-log*.json`がJSONとして読み込めない
- 通常画面で`window.__TEST_API__`が存在する

## ログ仕様

`test-log*.json`はテスト実行時に生成されたJSONである。最低限、次の項目を持つ。

- `status`: `passed`または`failed`
- `generatedAt`: 実行日時
- `totalFailures`: 失敗数
- `failures`: 失敗したシナリオと期待値・実測値
- `logs`: `scenario_start`、`spawned`、`assertion_passed`、`assertion_failed`、`scenario_end`、`test_end`

各ログには、可能な限り`scenarioId`、`phase`、`seed`、`mapId`、`frame`、`expected`、`actual`を含める。通常シナリオは`straight`、決定性確認シナリオは`reset()`で選択した実マップID（`twin_s`など）を記録する。

## 現行コード照合メモ（2026-09-09）

静的照合で、仕様書とテスト実装の次の差異を確認した。

- `test.js`はループで動的シナリオを生成し、実行予定件数は187件である。ソース中のシナリオIDリテラルを単純に数えると24件程度に見えるが、それは実行件数ではない。
- `test.js`の`expectedScenarioCount = 187`は、動的生成後の`scenario_end`件数を検証する値であり、現行コード上は妥当である。実際の成否は、ブラウザ実行後の`test_end`と最新ログで確認する。
- `test.js`のバフテストは、基本バフ13種の定義適用と10種類の基本実効値を確認する。拡張バフ90件の個別ランタイム効果、発掘ドローン、テックツリー編集、レギュレーション編集、スプライト描画は自動テストの網羅外である。
- 基本バフの実効値テストは、攻撃力、売却額、ドローン速度、ミサイル射程、畑HP、マシンガン間隔、ミサイル攻撃力、作物成長、スロー、科学生成の10項目である。即時資金・畑HP・科学生成には個別ランタイム確認もある。
- 拡張バフ90件は定義適用とID一意性までを確認する。建築費・ドローン購入費・アップグレード費の割引、発動時回復、Wave中一時ステータス、リロール、持ち越し、報酬置換、最大HP増加、発掘ドロップの実効値シナリオは現行`test.js`にはない。
- `getDefinitions()`は`CONFIG`、`REGULATIONS`、`ENEMY_DEFINITIONS`、`MAP_DEFINITIONS`、`TRAP_DEFINITIONS`、`BUFF_DEFINITIONS`、`SPRITE_CONFIG`を返す。API一覧にない補助APIも含め、上記の現行API一覧を正とする。
- `test.html`を直接開く運用であり、HTTPサーバーは不要である。テストログは`localStorage`の`farm-defense-test-log`へ保存し、「ログを保存」ボタンで`test-log.json`をダウンロードする。
- 現行`test.js`が実際に出力するイベントは`test_start`、`scenario_start`、`spawned`、`assertion_passed`、`assertion_failed`、`scenario_end`、`test_end`である。`effect_applied`などの詳細イベントはTEST仕様上の拡張候補であり、現行ログに出るとは扱わない。
- `TEST_RUNTIME.random`はテストページ内でシード付き実装へ差し替えられるが、`test.js`終了時の明示的な乱数復元処理はない。テストは`test.html`の独立ページで実行するため、通常画面のランタイムには影響しない。

## 網羅対象

### 敵

- `ENEMY_DEFINITIONS`の全敵ID（現在14種類。ショーケース専用敵を含む）
- 生成時のHP、最大HP、速度、攻撃力、装甲、罠耐性、能力ID
- 難易度・Wave補正、スポーン、経路探索、移動、再経路計算
- 畑のターゲット選択、攻撃、死亡、HP0後の除去
- Priest / Wizardの回復
- Drummer / Wizardの速度・攻撃力オーラ
- Shieldmasterの前方角度内外のダメージ軽減

### 罠

- 初期罠6種：`tile` 4種（`slow`、`poison`、`burn`、`armor_down`）と`line` 2種（`pull`、`knockback`）
- カスタム罠で利用可能な`line`、`tile`、`area`の3タイプ
- `slow`、`poison`、`burn`、`armor_down`、`stun`、`knockback`、`pull`の全7効果
- `trap_combination_line` / `tile` / `area`: 各罠タイプに毒1効果を設定し、罠の対象範囲内だけに毒が発動すること
- `trap_combination_area_slow`: 範囲罠にスロー1効果を設定し、範囲内の敵の速度低下、範囲外の敵への未適用、付与効果数1を確認すること
- `trap_combination_tile_multiple_effects`: 床面罠にスロー・毒・防御低下の3効果を設定し、同じ対象へ3効果が同時付与されること、各実効値、対象外への未適用を確認すること
- 射程、距離境界、対象数、最寄り選択、line方向、area半径、tile判定
- 効果量、持続時間、間隔、再適用、罠耐性、クールダウン
- Wave外停止、重複設置、定義コピー、無効定義、設置制約、難易度価格

### バフ

- 基本バフ13種の定義、取得、実行時効果
- 拡張バフ90種の定義、ID一意性、取得状態への反映
- ダメージ、射程、速度、クールダウン、畑HP、成長、売却、スロー、科学、即時資金
- 進行速度は2x、4x、8x、16xを選択でき、選択倍率に応じてWave出現タイマーなどのゲーム更新が進む。表示フレーム番号自体は倍率分増加しない。
- Wave表の敵数は、実行時に `floor(設定数 × CONFIG.waveDensityMultiplier)` へ変換される。初期値は1.25である。現行の `wave_exact_count` と `wave_round_robin_spawns` は、変換後も値が変わらない設定数（2または3）を使うため、倍率そのものを単独検証するケースではない。
- 建築・ドローン購入・アップグレード割引（仕様項目。現行`test.js`に実効値シナリオなし）
- 発動時回復、Wave効果、発動回数、建築数、追加取得（仕様項目。現行`test.js`に実効値シナリオなし）
- リロール、持ち越し、最大HP増加、報酬置換（仕様項目または未接続定義。現行`test.js`に実効値シナリオなし）
- 仕様上ランタイム未接続の定義は`not_connected`として明示する

### 共通・組み合わせ

- 同一シードで同一マップ・障害物配置が再現されること
- `step()`による手動更新とWave出現タイマー
- リセット後の状態分離
- 敵×罠、敵能力×罠、バフ×建物・畑・ドローンの相互作用
- 通常の`index.html`にテストAPIが公開されないこと

## AI照合手順

1. このファイルから必要なテスト対象と期待件数を確認する。
2. `test.js`に各対象へ対応するシナリオとアサーションがあるか確認する。
3. `script.js`のテストAPIが実際の状態変更・更新・観測を行っているか確認する。
4. `test-log*.json`の中から`generatedAt`が最も新しい有効なJSONを選び、全シナリオが実行済みか、`status`が`passed`か確認する。
5. `totalFailures`が0であることを確認する。
6. 仕様、実装、ログのいずれかにしか存在しない項目を差異として報告する。

## 完了条件

- TEST.mdの対象項目に対応するシナリオが`test.js`にある
- 全定義IDが少なくとも1回検証される
- 未接続の効果が明示される
- 最新の有効な`test-log*.json`の`status`が`passed`
- 最新の有効な`test-log*.json`の`totalFailures`が0
- 構文チェックと通常画面の起動確認が成功する

## ファイル構成

| ファイル | 役割 |
|---|---|
| `TEST.md` | AI照合用の基準仕様 |
| `test.html` | 直接起動するChrome用ランナー |
| `test.js` | テストケース、アサーション、ログ保存・ダウンロード |
| `script.js` | 決定的な初期化・乱数・更新・観測フック |
| `trap.js` | 罠エンジン本体 |
| `test-log*.json` | ダウンロードされた実行結果。`generatedAt`が最新の有効なファイルを採用 |

## SPEC照合追記（2026-09-07）

`SPEC.md` §13の照合結果をテスト基準にも反映する。現行実装では、マップ定義・選択中マップIDは`exportConfig()`の`common`に含まれず、スプライトの発掘前後定義も分離されていない。また、起動時に網羅検証されるのは主にレギュレーションとWave表であり、共通設定・マップ・スプライト・罠の全フィールドではない。これらをテストで扱う場合は、未実装項目として成功条件に混ぜず、仕様差異として記録する。
