import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(path.join(root, 'functions/package.json'));
const cliRequire = createRequire(require.resolve('firebase-tools'));

test('Firebase adopted literal-path watchers preserve file changes and regex exclusions', async () => {
  const config = JSON.parse(await fs.readFile(path.join(root, 'firebase.json'), 'utf8'));
  // Chokidar 4 deliberately removes glob parsing. This release uses literal paths
  // and the Firebase built-in regular-expression excludes, with no custom globs.
  assert.equal(config.functions.ignore, undefined, 'Custom function ignore globs require explicit compatibility review');
  const chokidar = cliRequire('chokidar');
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'urai-watcher-security-'));
  const watched = path.join(temporary, 'firestore.rules');
  await fs.writeFile(watched, 'first');
  const watcher = chokidar.watch(temporary, {persistent: true, ignoreInitial: true, ignored: [/(^|[\/\\])\../, /.+\.log/, /.+?[\\\/]node_modules[\\\/].+?/]});
  try {
    await new Promise((resolve, reject) => {
      const deadline = setTimeout(() => reject(new Error('Actual directory watcher did not become ready')), 10000);
      watcher.once('ready', () => {clearTimeout(deadline); resolve();});
      watcher.once('error', reject);
    });
    const changed = new Promise((resolve, reject) => {
      const deadline = setTimeout(() => reject(new Error('Actual watched rules change was not observed')), 10000);
      watcher.on('change', file => {if (file === watched) {clearTimeout(deadline); resolve();}});
      watcher.once('error', reject);
    });
    await fs.writeFile(watched, 'second');
    await changed;
    assert.equal(watcher._isIgnored(path.join(temporary, 'debug.log')), true);
    assert.equal(watcher._isIgnored(path.join(temporary, '.private')), true);
    assert.equal(watcher._isIgnored(path.join(temporary, 'node_modules/library.js')), true);
    assert.equal(watcher._isIgnored(watched), false);
  } finally {
    await watcher.close();
    await fs.rm(temporary, {recursive: true, force: true});
  }
});

test('Firebase CLI native callers load supported patched FTP and telemetry APIs', () => {
  const getUriRequire = createRequire(cliRequire.resolve('get-uri'));
  const {Client} = getUriRequire('basic-ftp');
  const client = new Client();
  for (const method of ['access', 'list', 'downloadTo', 'close', 'lastMod', 'size']) assert.equal(typeof client[method], 'function', method);
  client.close();
  const pubsubRequire = createRequire(cliRequire.resolve('@google-cloud/pubsub'));
  const {W3CTraceContextPropagator} = pubsubRequire('@opentelemetry/core');
  assert.equal(typeof new W3CTraceContextPropagator().extract, 'function');
  assert.doesNotThrow(() => pubsubRequire('./telemetry-tracing.js'));
  assert.doesNotThrow(() => cliRequire('get-uri'));
});
