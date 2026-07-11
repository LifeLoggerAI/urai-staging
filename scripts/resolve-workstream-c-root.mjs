#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const stamp = process.argv[2] || new Date().toISOString().replace(/[-:.]/g, '').replace('Z', 'Z');
const requested = process.env.WORKSTREAM_C_ROOT || `/tmp/urai-workstream-c-manual-${stamp}`;
const resolved = path.resolve(requested);

if (path.dirname(resolved) !== '/tmp') {
  throw new Error('WORKSTREAM_C_ROOT must resolve directly below /tmp.');
}
if (!path.basename(resolved).startsWith('urai-workstream-c-manual-')) {
  throw new Error('WORKSTREAM_C_ROOT must use the urai-workstream-c-manual- prefix.');
}

if (fs.existsSync(resolved) || fs.lstatSync(path.dirname(resolved)).isSymbolicLink()) {
  if (fs.existsSync(resolved)) {
    const stat = fs.lstatSync(resolved);
    if (stat.isSymbolicLink() || !stat.isDirectory()) {
      throw new Error('Existing WORKSTREAM_C_ROOT must be a real directory.');
    }
  }
}

process.stdout.write(`${resolved}\n`);
