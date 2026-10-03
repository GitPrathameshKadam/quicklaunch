"""Build only the reviewed allowlist, with reproducible timestamps and hashes."""
import hashlib
import json
from pathlib import Path
import subprocess
import zipfile

root = Path(__file__).resolve().parent.parent
# Every packaging entry point runs the gates, including direct Python use.
# Check before creating dist/ or opening a ZIP, so failure cannot emit a new
# archive that looks suitable for upload.
subprocess.run(['node', '--test', '--test-concurrency=1', *map(str, sorted((root / 'tests').glob('*.test.cjs')))], cwd=root, check=True)
subprocess.run(['node', str(root / 'scripts/check.cjs')], cwd=root, check=True)
files = json.loads((root / 'scripts/release-files.json').read_text())
manifest = json.loads((root / 'manifest.json').read_text())
output = root / 'dist'
output.mkdir(exist_ok=True)
archive = output / f"quicklaunch-v{manifest['version']}.zip"
source_hashes = {}
with zipfile.ZipFile(archive, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as bundle:
    for name in sorted(files):
        data = (root / name).read_bytes()
        source_hashes[name] = hashlib.sha256(data).hexdigest()
        item = zipfile.ZipInfo(name, date_time=(2026, 9, 30, 0, 0, 0))
        item.compress_type = zipfile.ZIP_DEFLATED
        item.external_attr = 0o100644 << 16
        bundle.writestr(item, data, compresslevel=9)
with zipfile.ZipFile(archive) as bundle:
    assert bundle.testzip() is None
    assert set(bundle.namelist()) == set(files)
    for name in files:
        assert bundle.read(name) == (root / name).read_bytes(), name
sha = hashlib.sha256(archive.read_bytes()).hexdigest()
(archive.with_suffix('.sha256')).write_text(f'{sha}  {archive.name}\n')
(archive.with_suffix('.files.json')).write_text(json.dumps(source_hashes, indent=2) + '\n')
print(f'{archive}\nSHA-256: {sha}\nVerified {len(files)} entries against current source.')
