param([int]$Jobs=4)
$ErrorActionPreference='Stop'
$projectDir=Split-Path $PSScriptRoot
$toolsDir=[IO.Path]::GetFullPath((Join-Path $projectDir '../../tools'))
$env:PATH="$toolsDir/ninja;$toolsDir/emsdk/node/24.19.0_64bit;$env:PATH"
$env:EMSDK_PYTHON="$toolsDir/emsdk/python/3.13.3_64bit/python.exe"
$env:TEMP="$toolsDir/temp";$env:TMP=$env:TEMP
$cmake="$toolsDir/cmake-3.31.8-windows-x86_64/bin/cmake.exe"
$node="$toolsDir/emsdk/node/24.19.0_64bit/node.exe"
function Checked([string]$Program,[string[]]$Arguments){& $Program @Arguments;if($LASTEXITCODE -ne 0){throw "$Program failed ($LASTEXITCODE)"}}
Push-Location $projectDir
try{
 Checked "$toolsDir/emsdk/upstream/emscripten/emcmake.bat" @($cmake,'-S','.', '-B','build-wasm-hegemon','-G','Ninja','-DCMAKE_BUILD_TYPE=Debug','-DOPENSE4_ENABLE_HEGEMON=ON',"-DSE4_DATA_DIR=$projectDir/private/se4")
 Checked $cmake @('--build','build-wasm-hegemon','-j',"$Jobs")
 Checked $node @('tests/hegemon-wasm.mjs')
 Checked $node @('tests/legacy-save-compat.mjs')
 Checked $env:EMSDK_PYTHON @('scripts/package_single_html.py','--hegemon')
 $env:SE4_UI_HTML='OpenSE4_Hegemon_WASM.html'
 Checked $node @('tests/offline-worker.mjs')
 Checked $node @('tests/ui-with-wasm.mjs')
 Checked $node @('tests/online-ui.mjs')
}finally{Remove-Item Env:SE4_UI_HTML -ErrorAction SilentlyContinue;Pop-Location}
