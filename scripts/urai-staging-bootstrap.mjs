#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const pkgPath = path.join(root, 'package.json');
const evidenceDir = path.join(root, 'artifacts', 'launch');
const evidencePath = path.join(evidenceDir, 'staging-bootstrap-report.json');
const env = { ...process.env };
delete env.NPM_CONFIG_PREFIX;
delete env.npm_config_prefix;

const report = {
  repo: 'LifeLoggerAI/urai-staging',
  kind: 'staging-bootstrap',
  startedAt: new Date().toISOString(),
  finishedAt: null,
  status: 'running',
  launchScore: 0,
  commandCount: 0,
  passedCount: 0,
  failedCount: 0,
  skipped: [],
  commands: []
};

fs.mkdirSync(evidenceDir, { recursive: true });

const problems = [];
if (!fs.existsSync(pkgPath)) problems.push('No package.json found. This must run from the LifeLoggerAI/urai-staging repo root.');
const pkg = fs.existsSync(pkgPath) ? JSON.parse(fs.readFileSync(pkgPath, 'utf8')) : null;
if (pkg && pkg.name !== 'urai-staging') problems.push(`Wrong repo: found package '${pkg.name}'. This bootstrap is for LifeLoggerAI/urai-staging.`);

if (process.env.NPM_CONFIG_PREFIX || process.env.npm_config_prefix) {
  report.skipped.push('NPM_CONFIG_PREFIX was present and removed for child commands.');
}

if (problems.length) {
  report.status = 'failed';
  report.finishedAt = new Date().toISOString();
  report.error = problems.join(' ');
  finalizeScore();
  writeReport();
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
} else {
  report.skipped.push('Rules tests skipped because URAI_SKIP_RULES=1.');
}

for (const [cmd, args] of commands) {
  const commandText = `${cmd} ${args.join(' ')}`;
  const commandStartedAt = new Date().toISOString();
  console.log(`\n$ ${commandText}`);
  const result = spawnSync(cmd, args, { cwd: root, stdio: 'inherit', env, shell: process.platform === 'win32' });
  const entry = {
    command: commandText,
    startedAt: commandStartedAt,
    finishedAt: new Date().toISOString(),
    status: result.status === 0 ? 'passed' : 'failed',
    exitCode: result.status ?? 1
  };
  report.commands.push(entry);
  finalizeScore();
  writeReport();
  if (result.status !== 0) {
    report.status = 'failed';
    report.finishedAt = new Date().toISOString();
    report.error = `Failed at: ${commandText}`;
    finalizeScore();
    writeReport();
    console.error(`\nURAI staging bootstrap failed at: ${commandText}`);
    console.error(`Evidence written to ${path.relative(root, evidencePath)}`);
    process.exit(result.status ?? 1);
  }
}

report.status = 'passed';
report.finishedAt = new Date().toISOString();
finalizeScore();
writeReport();
console.log('\nURAI staging bootstrap completed successfully.');
console.log(`Launch score: ${report.launchScore}/100`);
console.log(`Evidence written to ${path.relative(root, evidencePath)}`);

function finalizeScore() {
  report.commandCount = report.commands.length;
  report.passedCount = report.commands.filter((command) => command.status === 'passed').length;
  report.failedCount = report.commands.filter((command) => command.status === 'failed').length;
  const totalExpected = report.commands.length || 1;
  report.launchScore = Math.round((report.passedCount / totalExpected) * 100);
}

function writeReport() {
  fs.writeFileSync(evidencePath, `${JSON.stringify(report, null, 2)}\n`);
}
