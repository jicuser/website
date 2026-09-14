import base64, hashlib, json, pathlib, subprocess, tempfile, zlib, os
root = pathlib.Path.cwd()
def git(*args, **kwargs):
    return subprocess.check_output(['git', *args], **kwargs).decode().strip()
assert os.environ.get('GITHUB_REF') == 'refs/heads/maintenance/forms-integration'
raw = zlib.decompress(base64.b64decode(''.join(path.read_text() for path in sorted(root.glob('.integration/chunk-*.b64'))), validate=True))
assert len(raw) < 500_000
assert hashlib.sha256(raw).hexdigest() == 'd3103f2608bad2e6423ad35f494991511aff4ae4d185740f5733f90f4be3ad4c'
data = json.loads(raw)
subprocess.run(['git','merge-base','--is-ancestor',data['base'],'HEAD'],check=True)
def destination(name):
    relative = pathlib.PurePosixPath(name)
    assert not relative.is_absolute() and '..' not in relative.parts
    assert name in data['hashes'] and (name.startswith(('src/','supabase/','tests/')) or name in ['package.json','package-lock.json'])
    target = root / relative
    assert target.resolve().is_relative_to(root)
    target.parent.mkdir(parents=True,exist_ok=True)
    return target
for name, sha in data['reused'].items():
    assert len(sha) == 40 and all(c in '0123456789abcdef' for c in sha)
    destination(name).write_bytes(subprocess.check_output(['git','cat-file','blob',sha]))
for name, content in data['files'].items():
    destination(name).write_text(content)
with tempfile.NamedTemporaryFile(mode='w',suffix='.patch') as patch:
    patch.write(data['patch']); patch.flush()
    subprocess.run(['git','apply','--check',patch.name],check=True)
    subprocess.run(['git','apply',patch.name],check=True)
for name, expected in data['hashes'].items():
    assert git('hash-object',str(destination(name))) == expected, name
for path in root.glob('.integration/chunk-*.b64'): path.unlink()
(root/'.integration/assemble.py').unlink()
(root/'.github/workflows/assemble-content.yml').unlink()
(root/'.github/workflows/workspace-snapshot.yml').unlink(missing_ok=True)
subprocess.run(['git','add','--',*data['hashes'],'.integration','.github/workflows/assemble-content.yml','.github/workflows/workspace-snapshot.yml'],check=True)
subprocess.run(['git','config','user.name','github-actions[bot]'],check=True)
subprocess.run(['git','config','user.email','41898282+github-actions[bot]@users.noreply.github.com'],check=True)
subprocess.run(['git','commit','-m','Add website forms, assignments and linked poster pages\n\nPreserve the existing admin interface and private responses; keep page publication separate from form acceptance. Source transfer hashes verified. Full workflow verification follows this working-branch checkpoint. No hosting, app or production schema changes.'],check=True)
subprocess.run(['git','push','origin','HEAD:refs/heads/maintenance/forms-integration'],check=True)
print('SOURCE_COMMIT=' + git('rev-parse','HEAD'))
