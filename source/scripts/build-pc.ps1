param(
    [string]$OriginalInstall = 'C:\Users\curti\OneDrive\Documents\se4',
    [int]$Jobs = 4
)
$ErrorActionPreference = 'Stop'
$projectDir = Split-Path $PSScriptRoot
$toolsDir = [IO.Path]::GetFullPath((Join-Path $projectDir '..\..\tools'))
$cmake = Join-Path $toolsDir 'cmake-3.31.8-windows-x86_64\bin\cmake.exe'
$python = Join-Path $toolsDir 'emsdk\python\3.13.3_64bit\python.exe'
$node = Join-Path $toolsDir 'emsdk\node\24.19.0_64bit\node.exe'
$env:PATH = "$toolsDir\w64devkit\bin;$toolsDir\ninja;$(Split-Path $cmake);$(Split-Path $node);$env:PATH"
$env:EMSDK_PYTHON = $python
$env:TEMP = Join-Path $toolsDir 'temp'
$env:TMP = $env:TEMP
New-Item -ItemType Directory -Path $env:TEMP -Force | Out-Null
function Invoke-Checked([string]$Executable, [string[]]$Arguments) {
    & $Executable @Arguments
    if ($LASTEXITCODE -ne 0) { throw "$Executable exited with $LASTEXITCODE" }
}
Push-Location $projectDir
try {
    Invoke-Checked $python @('scripts/prepare_engine_data.py', $OriginalInstall, 'private/se4')
    Invoke-Checked $cmake @('-S','.', '-B','build-native','-G','Ninja','-DCMAKE_BUILD_TYPE=Debug',"-DCMAKE_CXX_COMPILER=$toolsDir/w64devkit/bin/g++.exe")
    Invoke-Checked $cmake @('--build','build-native','-j',"$Jobs")
    Invoke-Checked './build-native/browser_team_tests.exe' @('private/se4')
    Invoke-Checked './build-native/browser_production_tests.exe' @('private/se4')
    Invoke-Checked "$toolsDir\emsdk\upstream\emscripten\emcmake.bat" @($cmake,'-S','.', '-B','build-wasm','-G','Ninja','-DCMAKE_BUILD_TYPE=Debug',"-DSE4_DATA_DIR=$projectDir/private/se4")
    Invoke-Checked $cmake @('--build','build-wasm','-j',"$Jobs")
    Invoke-Checked $node @('--test','web/tests/*.test.mjs')
    Invoke-Checked $node @('tests/engine-parity.mjs','private/se4')
    Invoke-Checked $node @('tests/gameplay-loop.mjs')
    Invoke-Checked $node @('tests/new-game.mjs','private/se4')
    Invoke-Checked $node @('tests/update17.mjs')
    Invoke-Checked $python @('scripts/package_single_html.py')
    Invoke-Checked $node @('tests/offline-worker.mjs')
    Invoke-Checked $node @('tests/ui-with-wasm.mjs')
    Invoke-Checked $node @('tests/online-ui.mjs')
    Invoke-Checked $python @('scripts/write_pc_manifest.py')
} finally { Pop-Location }
