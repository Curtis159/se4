"""Record rebuilt outputs separately from the supplied historical manifest."""
from pathlib import Path
import hashlib
import json

root = Path(__file__).resolve().parents[1]

def record(path):
    return {"bytes": path.stat().st_size,
            "sha256": hashlib.sha256(path.read_bytes()).hexdigest()}

outputs = ["build-native/opense4.exe", "web/engine/opense4.wasm",
           "web/engine/opense4.mjs", "web/engine/opense4.data",
           "OpenSE4_Headless_WASM.html"]
reports = ["engine-parity-results.json", "gameplay-loop-results.json",
           "offline-worker-results.json", "ui-wasm-results.json", "new-game-results.json",
           "update17-results.json", "online-ui-results.json"]
manifest = {
    "date": "2026-11-09",
    "base": "SE4_PC_Codex_Latest_Development.zip/project",
    "laterPatchesMerged": [],
    "compilerNative": "GCC 16.2.0 (w64devkit 2.11.0)",
    "compilerWasm": "Emscripten 4.0.19",
    "hegemonEnabled": False,
    "realBrowserVerified": False,
    "outputs": {name: record(root / name) for name in outputs},
    "testReports": {name: json.loads((root / "tests" / name).read_text())
                    for name in reports},
    "sourceInputs": {str(p.relative_to(root)).replace("\\", "/"): record(p)
                     for directory in ("wasm", "upstream/src", "third_party", "web/src", "scripts", "supabase", "browser-learning")
                     for p in sorted((root / directory).rglob("*"))
                     if p.is_file()},
    "cmake": record(root / "CMakeLists.txt"),
    "presentationInputs": {name: record(root / name) for name in
                           ("web/index.html", "web/style.css", "web/assets/classic-art.json")},
}
target = root / "PC_BUILD_MANIFEST.json"
target.write_text(json.dumps(manifest, indent=2) + "\n")
print(target)
