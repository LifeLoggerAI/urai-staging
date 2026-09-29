#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const reportPath = path.join(root, 'artifacts', 'launch', 'staging-bootstrap-report.json');
const summaryPath = path.join(root, 'artifacts', 'launch', 'staging-bootstrap-summary.md');
const consumersPath = path.join(root, 'config', 'staging-consumers.json');
const problems = [];

if (!fs.existsSync(reportPath)) problems.push(`Missing report: ${path.relative(root, reportPath)}`);
if (!fs.existsSync(summaryPath)) problems.push(`Missing summary: ${path.relative(root, summaryPath)}`);

if (!problems.length) {
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  const authority = fs.existsSync(consumersPath)
    ? JSON.parse(fs.readFileSync(consumersPath, 'utf8'))
    : null;
  const activeAuthority = Array.isArray(authority?.consumers)
    ? authority.consumers.filter((entry) => entry?.state === 'active')
    : [];
  const commands = Array.isArray(report.commands) ? report.commands : [];
  const passedCommands = commands.filter(
    (command) => command?.status === 'passed' && command?.exitCode === 0,
  );
  const expectedScore = commands.length === 0
    ? 0
    : Math.round((passedCommands.length / commands.length) * 100);

  if (report.repo !== 'LifeLoggerAI/urai-staging') problems.push(`Unexpected repo: ${report.repo}`);
  if (!/^[0-9a-f]{40}$/.test(report.sourceSha ?? '')) problems.push(`Invalid exact source SHA: ${String(report.sourceSha)}`);
  if (report.projectId !== 'urai-staging') problems.push(`Unexpected projectId: ${report.projectId}`);
  if (report.environment !== 'staging') problems.push(`Unexpected environment: ${report.environment}`);
  if (report.productionAllowed !== false) problems.push('Evidence must record productionAllowed=false.');
  if (report.cloudDeploymentPerformed !== false) problems.push('Source evidence must record cloudDeploymentPerformed=false.');
  if (report.liveSmokePerformed !== false) problems.push('Source evidence must record liveSmokePerformed=false.');
  if (report.providerMutationPerformed !== false) problems.push('Source evidence must record providerMutationPerformed=false.');
  if (!authority) problems.push('Missing consumer authority while validating evidence.');
  const reportedConsumers = Array.isArray(report.activeConsumers) ? report.activeConsumers : [];
  if (reportedConsumers.length !== activeAuthority.length) {
    problems.push(`Active consumer count is ${reportedConsumers.length}, expected ${activeAuthority.length}.`);
  }
  for (const expected of activeAuthority) {
    const actual = reportedConsumers.find((entry) => entry?.id === expected.id);
    if (!actual) {
      problems.push(`Missing active consumer evidence: ${expected.id}`);
      continue;
    }
    for (const field of ['repository','repositoryId','pullRequest','exactSha','sourceRef','mode','dataPolicy','providerProject','allowedEnvironment','productionDeploymentAuthorized','productionDataAuthorized','longLivedCredentialsAuthorized']) {
      if (actual[field] !== expected[field]) problems.push(`Consumer ${expected.id} field ${field} mismatch.`);
    }
  }
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
  if (report.sourceBootstrapScore !== expectedScore) {
    problems.push(`Source bootstrap score is ${report.sourceBootstrapScore}, expected ${expectedScore}.`);
  }
  if (report.sourceBootstrapScore < 0 || report.sourceBootstrapScore > 100) {
    problems.push(`Source bootstrap score must remain within 0..100: ${report.sourceBootstrapScore}.`);
  }
  for (const command of commands) {
    if (command.status !== 'passed' || command.exitCode !== 0) {
      problems.push(`Command did not pass: ${command.command}`);
    }
  }

  const summary = fs.readFileSync(summaryPath, 'utf8');
  for (const marker of [
    `- Exact source SHA: ${report.sourceSha}`,
    '- Project: urai-staging',
    '- Environment: staging',
    '- Production allowed: false',
    '- Cloud deployment performed: false',
    '- Live smoke performed: false',
    '- Provider mutation performed: false',
    '- Status: passed',
    `- Source bootstrap score: ${expectedScore}/100`,
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
