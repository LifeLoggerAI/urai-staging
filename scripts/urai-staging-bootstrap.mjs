#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const pkgPath = path.join(root, 'package.json');
const evidenceDir = path.join(root, 'artifacts', 'launch');
const evidencePath = path.join(evidenceDir, 'staging-bootstrap-report.json');
const summaryPath = path.join(evidenceDir, 'staging-bootstrap-summary.md');
const env = { ...process.env };
delete env.NPM_CONFIG_PREFIX;
delete env.npm_config_prefix;
delete env.URAI_SKIP_RULES;

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
if (!fs.existsSync(path.join(root, 'functions', 'package-lock.json'))) {
  problems.push('Missing functions/package-lock.json; deterministic npm ci cannot run.');
}

if (process.env.NPM_CONFIG_PREFIX || process.env.npm_config_prefix) {
  report.skipped.push('NPM_CONFIG_PREFIX was present and removed for child commands.');
}
if (process.env.URAI_SKIP_RULES === '1') {
  report.skipped.push('URAI_SKIP_RULES was ignored; canonical staging verification always runs emulator-backed rules tests.');
}

if (problems.length) {
  report.status = 'failed';
  report.finishedAt = new Date().toISOString();
  report.error = problems.join(' ');
  finalizeScore();
  writeEvidence();
  console.error('URAI staging bootstrap cannot continue:');
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}

const commands = [
  ['npm', ['--prefix', 'functions', 'ci']],
  ['npm', ['run', 'doctor']],
  ['npm', ['run', 'check:deploy']],
  ['npm', ['run', 'check:lockfile']],
  ['npm', ['run', 'check:types']],
  ['npm', ['run', 'lint']],
  ['npm', ['run', 'test:unit']],
  ['npm', ['run', 'test:rules']],
  ['npm', ['run', 'build']],
  ['npm', ['run', 'launch:p0']]
];

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
  writeEvidence();
  if (result.status !== 0) {
    report.status = 'failed';
    report.finishedAt = new Date().toISOString();
    report.error = `Failed at: ${commandText}`;
    finalizeScore();
    writeEvidence();
    console.error(`\nURAI staging bootstrap failed at: ${commandText}`);
    console.error(`Evidence written to ${path.relative(root, evidencePath)}`);
    console.error(`Summary written to ${path.relative(root, summaryPath)}`);
    process.exit(result.status ?? 1);
  }
}

report.status = 'passed';
report.finishedAt = new Date().toISOString();
finalizeScore();
writeEvidence();
console.log('\nURAI staging bootstrap completed successfully.');
console.log(`Launch score: ${report.launchScore}/100`);
console.log(`Evidence written to ${path.relative(root, evidencePath)}`);
console.log(`Summary written to ${path.relative(root, summaryPath)}`);

function finalizeScore() {
  report.commandCount = report.commands.length;
  report.passedCount = report.commands.filter((command) => command.status === 'passed').length;
  report.failedCount = report.commands.filter((command) => command.status === 'failed').length;
  const totalExpected = 10;
  report.launchScore = Math.round((report.passedCount / totalExpected) * 100);
}

function writeEvidence() {
  fs.writeFileSync(evidencePath, `${JSON.stringify(report, null, 2)}\n`);
  writeSummary();
}

function writeSummary() {
  const lines = [
    '# URAI Staging Launch Evidence Summary',
    '',
    `- Repository: ${report.repo}`,
    `- Kind: ${report.kind}`,
    `- Status: ${report.status}`,
    `- Launch score: ${report.launchScore}/100`,
    `- Started: ${report.startedAt}`,
    `- Finished: ${report.finishedAt ?? 'not finished'}`,
    `- Passed commands: ${report.passedCount}`,
    `- Failed commands: ${report.failedCount}`,
    `- Total commands: ${report.commandCount}`,
    ''
  ];

  if (report.error) lines.push('## Failure', '', report.error, '');
  if (report.skipped.length) {
    lines.push('## Adjusted environment', '');
    for (const skipped of report.skipped) lines.push(`- ${skipped}`);
    lines.push('');
  }

  lines.push('## Command Results', '', '| Status | Exit | Command |', '| --- | ---: | --- |');
  for (const command of report.commands) {
    lines.push(`| ${command.status} | ${command.exitCode} | \`${command.command}\` |`);
  }
  lines.push('');
  fs.writeFileSync(summaryPath, `${lines.join('\n')}\n`);
}
