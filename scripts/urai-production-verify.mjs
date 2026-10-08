import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const commands = [];

if (existsSync('package.json')) {
  // Match the canonical staging bootstrap before root scripts delegate to Functions.
  if (existsSync('functions/package.json')) {
    commands.push(['npm', ['--prefix', 'functions', 'ci', '--ignore-scripts', '--engine-strict', '--audit=false']]);
    commands.push(['node', ['scripts/check-installed-security.mjs']]);
  }
  commands.push(['npm', ['run', 'typecheck', '--if-present']]);
  commands.push(['npm', ['test', '--if-present']]);
  commands.push(['npm', ['run', 'build', '--if-present']]);
  commands.push(['npm', ['run', 'urai:qa', '--if-present']]);
}

let failed = false;
for (const [cmd, args] of commands) {
  console.log(`\n> ${cmd} ${args.join(' ')}`);
  const result = spawnSync(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.status !== 0) failed = true;
}

if (!commands.length) console.log('No package.json found; nothing to verify.');
process.exit(failed ? 1 : 0);
