#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const reportPath = path.join(root, 'artifacts', 'launch', 'staging-bootstrap-report.json');
const summaryPath = path.join(root, 'artifacts', 'launch', 'staging-bootstrap-summary.md');
const problems = [];

if (!fs.existsSync(reportPath)) problems.push(`Missing report: ${path.relative(root, reportPath)}`);
if (!fs.existsSync(summaryPath)) problems.push(`Missing summary: ${path.relative(root, summaryPath)}`);

if (!problems.length) {
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  const commands = Array.isArray(report.commands) ? report.commands : [];
  const passedCommands = commands.filter(
    (command) => command?.status === 'passed' && command?.exitCode === 0,
  );
  const expectedScore = commands.length === 0
    ? 0
    : Math.round((passedCommands.length / commands.length) * 100);

  if (report.repo !== 'LifeLoggerAI/urai-staging') problems.push(`Unexpected repo: ${report.repo}`);
  if (report.kind !== 'staging-bootstrap') problems.push(`Unexpected evidence kind: ${report.kind}`);
  if (report.status !== 'passed') problems.push(`Evidence status is not passed: ${report.status}`);
  if (commands.length === 0) problems.push('No command evidence recorded.');
  if (report.commandCount !== commands.length) {
    problems.push(`Command count is ${report.commandCount}, expected ${commands.length}.`);
  }
  if (report.passedCount !== passedCommands.length) {
    problems.push(`Passed count is ${report.passedCount}, expected ${passedCommands.length}.`);
  }
  if (report.failedCount !== commands.length - passedCommands.length) {
    problems.push(
      `Failed command count is ${report.failedCount}, expected ${commands.length - passedCommands.length}.`,
    );
  }
  if (report.launchScore !== expectedScore) {
    problems.push(`Evidence score is ${report.launchScore}, expected ${expectedScore}.`);
  }
  if (report.launchScore < 0 || report.launchScore > 100) {
    problems.push(`Evidence score must remain within 0..100: ${report.launchScore}.`);
  }
  for (const command of commands) {
    if (command.status !== 'passed' || command.exitCode !== 0) {
      problems.push(`Command did not pass: ${command.command}`);
    }
  }

  const summary = fs.readFileSync(summaryPath, 'utf8');
  for (const marker of [
    '- Status: passed',
    `- Launch score: ${expectedScore}/100`,
    `- Passed commands: ${passedCommands.length}`,
    '- Failed commands: 0',
    `- Total commands: ${commands.length}`,
  ]) {
    if (!summary.includes(marker)) problems.push(`Summary is missing exact marker: ${marker}`);
  }
}

if (problems.length) {
  console.error('URAI staging launch evidence validation failed:');
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}

console.log('URAI staging launch evidence is valid.');
