#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const stamp = process.argv[2] || new Date().toISOString().replace(/[-:.]/g, '');
const requested = process.env.WORKSTREAM_C_ROOT || `/tmp/urai-workstream-c-manual-${stamp}`;
const resolved = path.resolve(requested);
const parent = path.dirname(resolved);

if (parent !== '/tmp') {
  throw new Error('WORKSTREAM_C_ROOT must resolve directly below /tmp.');
}
if (!path.basename(resolved).startsWith('urai-workstream-c-manual-')) {
  throw new Error('WORKSTREAM_C_ROOT must use the urai-workstream-c-manual- prefix.');
}

const parentStat = fs.lstatSync(parent);
if (parentStat.isSymbolicLink() || !parentStat.isDirectory()) {
  throw new Error('/tmp must be a real directory.');
}

if (fs.existsSync(resolved)) {
  const stat = fs.lstatSync(resolved);
  if (stat.isSymbolicLink() || !stat.isDirectory()) {
    throw new Error('Existing WORKSTREAM_C_ROOT must be a real directory.');
  }
}

process.stdout.write(`${resolved}\n`);
