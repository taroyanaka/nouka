# スプライトシート保存と一括リネーム

このフォルダにスプライトシート画像を保存します。`rename_sprite_sheets.ps1` は、画像をファイル名順に並べ、次の名前を1行目から順に割り当てます。

`outside`、`floor`、`blocked`、`slow`、`spawn`、`base`、`farm`、`wall`、`lab`、`mg`、`missile`、`trap`、`enemy`、`drone`、`droneSow`、`droneWater`、`droneHarvest`、`droneExcavation`、`bullet`、`explosion`、`trapEffect`、`sowEffect`、`waterEffect`、`harvestEffect`、`excavationEffect`

別の名前を使う場合だけ、`-NamesFile` で名前一覧ファイルを指定してください。`sprite-names.txt` には既定の名前一覧も記載しています。

対象画像はファイル名順（数字を含む場合も通常の名前順）に並び、テキストの1行目から順に対応します。空行と `#` で始まる行は無視されます。名前に拡張子を書いた場合は自動的に除去され、元の画像の拡張子が維持されます。

## 実行方法

PowerShellでこのフォルダを開き、まず確認だけする場合:

```powershell
.\rename_sprite_sheets.ps1 -WhatIf
```

問題なければ実行:

```powershell
.\rename_sprite_sheets.ps1
```

別の名前一覧ファイルを指定することもできます。

```powershell
.\rename_sprite_sheets.ps1 -NamesFile .\my-names.txt
```

画像数と名前数が一致しない場合や、名前が重複する場合は変更せずに停止します。
