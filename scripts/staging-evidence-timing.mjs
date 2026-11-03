/** Enforce the chronological shape of the 15 sequential bootstrap commands.
 * Timing validity is necessary for acceptance, but NOT independent execution proof. */
function instant(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString() === value ? date.getTime() : null;
}

export function stagingEvidenceTimingProblems(report) {
  const problems = [];
  if (!report || typeof report !== 'object' || Array.isArray(report)) return ['Missing bootstrap report.'];
  const started = instant(report.startedAt);
  const finished = instant(report.finishedAt);
  if (started === null || finished === null || finished < started) {
    problems.push('Bootstrap run has an invalid or reversed completion window.');
  }
  const commands = Array.isArray(report.commands) ? report.commands : [];
  let precedingEnd = started;
  for (let i = 0; i < commands.length; i += 1) {
    const entry = commands[i];
    const from = instant(entry?.startedAt);
    const to = instant(entry?.finishedAt);
    if (from === null || to === null || to < from ||
        started === null || finished === null || from < started || to > finished ||
        (precedingEnd !== null && from < precedingEnd)) {
      problems.push(`Bootstrap command ${i + 1} has missing, reversed, overlapping or out-of-window timestamps.`);
    }
    if (to !== null) precedingEnd = to;
  }
  return problems;
}
