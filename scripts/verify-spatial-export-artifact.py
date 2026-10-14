#!/usr/bin/env python3
"""Fail-closed extraction of pinned, real Spatial Actions compiled output."""
import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
import stat
import zipfile

SOURCE = '9f7127753c81ad5e3b4cd0e6a9261ad98ccb0c52'
ZIP_SHA = '90b26a23f30495619e5cebf26573146e103ea915547cb2822ee28d0a6b7eaeb1'
NATIVE_MANIFEST_SHA = '07cb7a6bd32a43f33f118997151e9b753714afbd069ab00b01784ef6639a1b8a'
SOURCE_MANIFEST_SHA = '7656abc6a07e76c5ae0d8caabd5b878a59d2ae0aaf4126d0e17c41e695c7cc0c'
SOURCE_TREE_SHA = 'd04ef33310631f853d897c23a76f61aec8ad6827'
ARTIFACT_ID = 11855755491
SOURCE_RUN_ID = 38477717820
FILE_COUNT = 1525
FILE_BYTES = 143890239
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
    if digest(destination / MANIFEST_PATH) != SOURCE_MANIFEST_SHA:
        refuse('source manifest SHA-256 diverged from pinned GitHub artifact')
    manifest = json.loads((destination / MANIFEST_PATH).read_text())
    if (manifest.get('schemaVersion') != 'urai-real-spatial-static-export-1'
        or manifest.get('repository') != 'LifeLoggerAI/urai-spatial'
        or manifest.get('sourceSha') != SOURCE
        or manifest.get('sourceTreeSha') != SOURCE_TREE_SHA
        or manifest.get('fileCount') != FILE_COUNT
        or manifest.get('totalBytes') != FILE_BYTES):
        refuse('source manifest is not the previously verified build')
    expected = manifest.get('files')
    if not isinstance(expected, list) or len(expected) != FILE_COUNT:
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
    artifact = {'workflowRunId': SOURCE_RUN_ID, 'artifactId': ARTIFACT_ID,
                'zipSha256': ZIP_SHA, 'sourceManifestSha256': SOURCE_MANIFEST_SHA,
                'sourceTreeSha': SOURCE_TREE_SHA, 'fileCount': FILE_COUNT,
                'totalBytes': FILE_BYTES}
    if (bound.get('sourceSha') != SOURCE or bound.get('sourcePullRequest') != 1636
        or bound.get('sourceArtifact') != artifact
        or bound.get('deployed') is not False
        or bound.get('stagingDeploymentAuthorized') is not False
        or bound.get('finalAssetAdmissions') != 0 or bound.get('files') != source['files']):
        refuse('native assembler identity, contents, or fail-closed authority differs')
    # Verify both inventories: immutable compiled inputs and actual public bytes.
    restricted = ['/xr/', '/spatial/ar-vr/']
    source_files = source['files']
    allowed = [entry for entry in source_files if not any(entry['path'].startswith(prefix.lstrip('/')) for prefix in restricted)]
    withheld = [entry for entry in source_files if any(entry['path'].startswith(prefix.lstrip('/')) for prefix in restricted)]
    if (bound.get('restrictedStaticPrefixes') != restricted
        or bound.get('servedFiles') != allowed
        or bound.get('withheldFiles') != withheld
        or bound.get('servedFileCount') != len(allowed)
        or bound.get('servedTotalBytes') != sum(x['bytes'] for x in allowed)):
        refuse('public serving inventory or restricted XR routing diverged')
    served = output / 'public'
    actual_names = {x.relative_to(served).as_posix() for x in served.rglob('*') if x.is_file()}
    if actual_names != {x['path'] for x in allowed}:
        refuse('extra, absent, or forbidden files in Hosting public root')
    for item in allowed:
        candidate = served.joinpath(*PurePosixPath(item['path']).parts)
        if (not candidate.is_file() or candidate.is_symlink()
            or candidate.stat().st_size != item['bytes']
            or digest(candidate) != item['sha256']):
            refuse('served file digest mismatch: ' + item['path'])
    if not (output / 'UNAPPROVED-firebase.consumer-staging.json').is_file():
        refuse('missing explicitly unapproved Firebase config')
    hosted = json.loads((output / 'UNAPPROVED-firebase.consumer-staging.json').read_text())
    if any(rule.get('source') in ('**', '/xr/**', '/spatial/ar-vr/**') for rule in hosted.get('hosting', {}).get('rewrites', [])):
        refuse('unsafe staging Hosting catchall or protected route')
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
