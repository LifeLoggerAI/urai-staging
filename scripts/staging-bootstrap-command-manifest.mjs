/**
 * Exact, ordered nonproduction launch-bootstrap command inventory.
 * Shared by the executor and the evidence verifier to prevent a partial
 * or substituted report from claiming full staging acceptance.
 */
export const stagingBootstrapCommands = Object.freeze([
  ['node', ['--test', 'scripts/test-twilio-trial-sender.mjs', 'scripts/test-sendgrid-staging-budget.mjs']],
  ['npm', ['--prefix', 'functions', 'ci', '--ignore-scripts', '--engine-strict', '--audit=false']],
  ['node', ['scripts/check-installed-security.mjs']],
  ['node', ['--test', 'scripts/test-security-dependency-compatibility.mjs']],
  ['npm', ['run', 'doctor']],
  ['npm', ['run', 'test:workstream-c-root']],
  ['npm', ['run', 'test:workstream-c-confinement']],
  ['npm', ['run', 'check:deploy']],
  ['npm', ['run', 'check:lockfile']],
  ['npm', ['run', 'check:types']],
  ['npm', ['run', 'lint']],
  ['npm', ['run', 'test:unit']],
  ['npm', ['run', 'test:rules']],
  ['npm', ['run', 'build']],
  ['npm', ['run', 'launch:p0']],
].map(([command, args]) => Object.freeze([command, Object.freeze(args)])));

export const stagingBootstrapCommandTexts = Object.freeze(
  stagingBootstrapCommands.map(([command, args]) => `${command} ${args.join(' ')}`),
);

export function hasExactStagingBootstrapInventory(observed) {
  return Array.isArray(observed)
    && observed.length === stagingBootstrapCommandTexts.length
    && observed.every((entry, index) => entry
      && typeof entry === 'object'
      && entry.command === stagingBootstrapCommandTexts[index]);
}
