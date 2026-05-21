#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const pkgPath = path.join(root, 'package.json');
const env = { ...process.env };
delete env.NPM_CONFIG_PREFIX;
delete env.npm_config_prefix;

const problems = [];
if (!fs.existsSync(pkgPath)) problems.push('No package.json found. This must run from the LifeLoggerAI/urai-staging repo root.');
const pkg = fs.existsSync(pkgPath) ? JSON.parse(fs.readFileSync(pkgPath, 'utf8')) : null;
if (pkg && pkg.name !== 'urai-staging') problems.push(`Wrong repo: found package '${pkg.name}'. This bootstrap is for LifeLoggerAI/urai-staging.`);

if (problems.length) {
  console.error('URAI staging bootstrap cannot continue:');
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}

const commands = [
  ['npm', ['install']],
  ['npm', ['--prefix', 'functions', 'install']],
  ['npm', ['run', 'doctor']],
  ['npm', ['run', 'check:deploy']],
  ['npm', ['run', 'check:lockfile']],
  ['npm', ['run', 'check:types']],
  ['npm', ['run', 'lint']],
  ['npm', ['run', 'test:unit']],
  ['npm', ['run', 'build']],
  ['npm', ['run', 'launch:p0']]
];

if (process.env.URAI_SKIP_RULES !== '1') {
  commands.splice(commands.length - 2, 0, ['npm', ['run', 'test:rules']]);
}

for (const [cmd, args] of commands) {
  console.log(`\n$ ${cmd} ${args.join(' ')}`);
  const result = spawnSync(cmd, args, { cwd: root, stdio: 'inherit', env, shell: process.platform === 'win32' });
  if (result.status !== 0) {
    console.error(`\nURAI staging bootstrap failed at: ${cmd} ${args.join(' ')}`);
    process.exit(result.status ?? 1);
  }
}

console.log('\nURAI staging bootstrap completed successfully.');
