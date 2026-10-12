#!/usr/bin/env python3
"""Fail-closed extraction of pinned, real Spatial Actions compiled output."""
import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
import stat
import zipfile

SOURCE = '5e9801bda83e0a14795c8307fb717fe73bc7a6a4'
ZIP_SHA = 'f1f3ec5657feb62fd6c8cc3fc39ed4acb1c1e8828b1b34ce6e052f281adcdfcc'
NATIVE_MANIFEST_SHA = 'cddb62ae9c2dd5e47a90416be9f307c157b3710f7fede1c855d3f029536103e7'
MANIFEST_PATH = 'artifacts/consumer-export/real-static-manifest.json'
EXPORT_PREFIX = 'urai-tier1/out/'


def digest(path):
    h = hashlib.sha256()
    with open(path, 'rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()


def refuse(reason):
    raise ValueError('Pinned real consumer artifact rejected: ' + reason)


def archive(archive, destination):
    if digest(archive) != ZIP_SHA:
        refuse('original GitHub ZIP SHA-256 differs')
    if destination.exists():
        refuse('extraction destination already exists')
    destination.mkdir(parents=True)
    with zipfile.ZipFile(archive) as zipped:
        names = set()
        total = 0
        for info in zipped.infolist():
            name = info.filename
            p = PurePosixPath(name)
            if not name or name.startswith('/') or '\\' in name or '..' in p.parts or info.is_dir():
                refuse('unexpected archive entry: ' + name)
            if not (name.startswith(EXPORT_PREFIX) or name == MANIFEST_PATH):
                refuse('unexpected archive path: ' + name)
            if name.lower() in names:
                refuse('duplicate archive member: ' + name)
            names.add(name.lower())
            file_type = (info.external_attr >> 16) & 0o170000
            if file_type not in (0, stat.S_IFREG):
                refuse('nonregular archive entry: ' + name)
            if info.file_size > 128 * 1024 * 1024:
                refuse('oversized individual archive entry')
            total += info.file_size
            if total > 750 * 1024 * 1024 or len(names) > 40000:
                refuse('oversized archive')
            target = destination.joinpath(*p.parts)
            target.parent.mkdir(parents=True, exist_ok=True)
            with zipped.open(info) as source, open(target, 'xb') as output:
                for chunk in iter(lambda: source.read(1024 * 1024), b''):
                    output.write(chunk)
    manifest = json.loads((destination / MANIFEST_PATH).read_text())
    if (manifest.get('schemaVersion') != 'urai-real-spatial-static-export-1'
        or manifest.get('repository') != 'LifeLoggerAI/urai-spatial'
        or manifest.get('sourceSha') != SOURCE
        or manifest.get('fileCount') != 1522
        or manifest.get('totalBytes') != 143738546):
        refuse('source manifest is not the previously verified build')
    expected = manifest.get('files')
    if not isinstance(expected, list) or len(expected) != 1522:
        refuse('invalid file hash inventory')
    export = destination / 'urai-tier1/out'
    seen = set()
    for entry in expected:
        path = entry['path']
        pure = PurePosixPath(path)
        if path.startswith('/') or '..' in pure.parts or path in seen:
            refuse('unsafe manifest file reference')
        seen.add(path)
        actual = export.joinpath(*pure.parts)
        if not actual.is_file() or actual.is_symlink() or actual.stat().st_size != entry['bytes'] or digest(actual) != entry['sha256']:
            refuse('manifest mismatch: ' + path)
    actual = {x.relative_to(export).as_posix() for x in export.rglob('*') if x.is_file()}
    if actual != seen:
        refuse('extra or missing compiled export files')
    print(json.dumps({'stage': 'verified-real-compiled-output', 'sourceSha': SOURCE, 'files': len(seen), 'totalBytes': manifest['totalBytes'], 'hashMismatches': 0}))


def native(destination, output):
    manifest_path = output / 'consumer-artifact-manifest.json'
    if digest(manifest_path) != NATIVE_MANIFEST_SHA:
        refuse('native assembler manifest diverged from the original verified package')
    source = json.loads((destination / MANIFEST_PATH).read_text())
    bound = json.loads(manifest_path.read_text())
    if (bound.get('sourceSha') != SOURCE or bound.get('deployed') is not False
        or bound.get('stagingDeploymentAuthorized') is not False
        or bound.get('finalAssetAdmissions') != 0 or bound.get('files') != source['files']):
        refuse('native assembler identity, contents, or fail-closed authority differs')
    if not (output / 'UNAPPROVED-firebase.consumer-staging.json').is_file():
        refuse('missing explicitly unapproved Firebase config')
    print(json.dumps({'stage': 'native-output-byte-identical', 'sourceSha': SOURCE,
                      'nativeManifestSha256': NATIVE_MANIFEST_SHA,
                      'files': len(bound['files']), 'deployed': False}))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--archive', required=True)
    parser.add_argument('--out', required=True)
    parser.add_argument('--native')
    options = parser.parse_args()
    destination = Path(options.out).resolve()
    if options.native:
        if not destination.is_dir():
            refuse('verified extraction directory absent')
        native(destination, Path(options.native).resolve())
    else:
        archive(Path(options.archive).resolve(), destination)
