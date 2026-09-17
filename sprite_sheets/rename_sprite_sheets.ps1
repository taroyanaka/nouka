param(
    [string]$NamesFile = (Join-Path $PSScriptRoot 'sprite-names.txt'),
    [switch]$WhatIf
)

$ErrorActionPreference = 'Stop'
$imageExtensions = @('.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp')

if (-not (Test-Path -LiteralPath $NamesFile -PathType Leaf)) {
    throw "名前一覧ファイルが見つかりません: $NamesFile"
}

$files = @(Get-ChildItem -LiteralPath $PSScriptRoot -File |
    Where-Object { $imageExtensions -contains $_.Extension.ToLowerInvariant() } |
    Sort-Object Name)

$names = @(Get-Content -LiteralPath $NamesFile -Encoding UTF8 |
    ForEach-Object { $_.Trim() } |
    Where-Object { $_ -and -not $_.StartsWith('#') })

if ($files.Count -eq 0) {
    Write-Host '対象画像がありません。'
    exit 0
}
if ($names.Count -ne $files.Count) {
    throw "画像は $($files.Count) 個、名前は $($names.Count) 個です。数を一致させてください。"
}

$targets = for ($i = 0; $i -lt $files.Count; $i++) {
    $name = [IO.Path]::GetFileNameWithoutExtension($names[$i])
    if (-not $name) { throw "名前一覧の $($i + 1) 行目が空です。" }
    [PSCustomObject]@{ Source = $files[$i]; Target = "$name$($files[$i].Extension)" }
}

$duplicates = @($targets.Target | Group-Object | Where-Object Count -gt 1)
if ($duplicates.Count) { throw "名前一覧に重複があります: $($duplicates.Name -join ', ')" }

Write-Host "対象: $($files.Count) ファイル"
for ($i = 0; $i -lt $targets.Count; $i++) {
    Write-Host ("{0}. {1} -> {2}" -f ($i + 1), $targets[$i].Source.Name, $targets[$i].Target)
}

if ($WhatIf) { exit 0 }

$temporary = @()
try {
    foreach ($item in $targets) {
        $tempName = ".__rename_tmp_$([guid]::NewGuid().ToString('N'))$($item.Source.Extension)"
        Rename-Item -LiteralPath $item.Source.FullName -NewName $tempName
        $temporary += [PSCustomObject]@{ Temp = Join-Path $PSScriptRoot $tempName; Target = $item.Target }
    }
    foreach ($item in $temporary) {
        Rename-Item -LiteralPath $item.Temp -NewName $item.Target
    }
    Write-Host 'リネームが完了しました。' -ForegroundColor Green
}
catch {
    Write-Warning "リネーム中にエラーが発生しました: $($_.Exception.Message)"
    throw
}
