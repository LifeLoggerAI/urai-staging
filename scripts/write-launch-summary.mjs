#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const reportPath = path.join(root, 'artifacts', 'launch', 'staging-bootstrap-report.json');
const summaryPath = path.join(root, 'artifacts', 'launch', 'staging-bootstrap-summary.md');

if (!fs.existsSync(reportPath)) {
  console.error(`Missing launch report: ${path.relative(root, reportPath)}`);
  process.exit(1);
}

const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const lines = [
  '# URAI Staging Launch Evidence Summary',
  '',
  `- Repository: ${report.repo}`,
  `- Kind: ${report.kind}`,
  `- Exact source SHA: ${report.sourceSha}`,
  `- Project: ${report.projectId}`,
  `- Environment: ${report.environment}`,
  `- Production allowed: ${report.productionAllowed}`,
  `- Cloud deployment performed: ${report.cloudDeploymentPerformed}`,
  `- Live smoke performed: ${report.liveSmokePerformed}`,
  `- Provider mutation performed: ${report.providerMutationPerformed}`,
  `- Status: ${report.status}`,
  `- Source bootstrap score: ${report.sourceBootstrapScore}/100`,
  `- Started: ${report.startedAt}`,
  `- Finished: ${report.finishedAt ?? 'not finished'}`,
  `- Passed commands: ${report.passedCount}`,
  `- Failed commands: ${report.failedCount}`,
  `- Total commands: ${report.commandCount}`,
  '',
];

if (Array.isArray(report.activeConsumers) && report.activeConsumers.length) {
  lines.push('## Active consumer authority', '');
  for (const consumer of report.activeConsumers) {
    lines.push(`- ${consumer.id}: ${consumer.repository} PR #${consumer.pullRequest} @ ${consumer.exactSha} (${consumer.mode}; ${consumer.dataPolicy})`);
  }
  lines.push('');
}

if (report.error) {
  lines.push('## Failure', '', report.error, '');
}

if (Array.isArray(report.skipped) && report.skipped.length) {
  lines.push('## Skipped / Adjusted', '');
  for (const skipped of report.skipped) lines.push(`- ${skipped}`);
  lines.push('');
}

lines.push('## Command Results', '', '| Status | Exit | Command |', '| --- | ---: | --- |');
for (const command of report.commands ?? []) {
  lines.push(`| ${command.status} | ${command.exitCode} | \`${command.command}\` |`);
}
lines.push('');

fs.writeFileSync(summaryPath, `${lines.join('\n')}\n`);
console.log(`Launch summary written to ${path.relative(root, summaryPath)}`);
