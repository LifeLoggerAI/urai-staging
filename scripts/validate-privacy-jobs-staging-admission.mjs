import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

/** Source-level staging admission only. PASS does not attest deployment or credentials. */
export function privacyJobsStagingAdmissionProblems(authority) {
  const errors = [];
  if (!authority || typeof authority !== 'object' || Array.isArray(authority)) return ['staging authority missing'];
  if (authority.projectId !== 'urai-staging' || authority.environment !== 'staging' || authority.productionAllowed !== false) {
    errors.push('staging project/environment boundary invalid');
  }
  if (!Array.isArray(authority.consumers)) return [...errors, 'staging consumers list missing'];
  const required = [
    ['LifeLoggerAI/urai-privacy', 'privacy revocation issuer'],
    ['LifeLoggerAI/urai-jobs', 'Jobs revocation receiver'],
  ];
  for (const [repository, label] of required) {
    const all = authority.consumers.filter(c => c && c.repository === repository);
    const active = all.filter(c => c.state === 'active');
    if (active.length !== 1 || all.length !== 1) {
      errors.push(`${label}: requires one explicitly active reviewed consumer, found ${active.length}`);
      continue;
    }
    const c = active[0];
    if (!/^[a-f0-9]{40}$/.test(c.exactSha ?? '')) errors.push(`${label}: immutable exact source SHA missing`);
    if (typeof c.sourceRef !== 'string' || !/^refs\/(heads|tags)\/[A-Za-z0-9._/-]+$/.test(c.sourceRef)) {
      errors.push(`${label}: source reference missing or invalid`);
    }
    if (c.providerProject !== 'urai-staging' || c.allowedEnvironment !== 'staging') {
      errors.push(`${label}: receiver and issuer must belong to reviewed staging project`);
    }
    if (c.dataPolicy !== 'synthetic-only') errors.push(`${label}: real consumer data forbidden during staging qualification`);
    for (const flag of ['productionDeploymentAuthorized', 'productionDataAuthorized',
      'longLivedCredentialsAuthorized', 'projectWideRuleMutationAuthorized', 'hostingMutationAuthorized']) {
      if (c[flag] !== false) errors.push(`${label}: ${flag} must be explicitly false`);
    }
    if (!Array.isArray(c.allowedDeployScopes) ||
        c.allowedDeployScopes.length !== 1 || c.allowedDeployScopes[0] !== 'functions-explicit-only') {
      errors.push(`${label}: allowed deploy scope must be explicitly Functions-only`);
    }
  }
  return errors;
}

// A source-only admission PASS does not establish that a Jobs host exists,
// that it matches a deployed SHA, or that revocations have crossed the wire.
if (process.argv[1] && fileURLToPath(import.meta.url) === fs.realpathSync(process.argv[1])) {
  let authority;
  try { authority = JSON.parse(fs.readFileSync(new URL('../config/staging-consumers.json', import.meta.url), 'utf8')); }
  catch { console.error('[GENESIS STAGING] BLOCKED: unable to read trusted consumer authority'); process.exit(1); }
  const problems = privacyJobsStagingAdmissionProblems(authority);
  if (problems.length) {
    console.error('[GENESIS STAGING] BLOCKED: Privacy-to-Jobs staged consumer ownership is not accepted.');
    for (const problem of problems) console.error('- ' + problem);
    process.exit(1);
  }
  console.log('[GENESIS STAGING] Source consumer scope PASS. Runtime, emulators, credentials, independent reviews and deployment remain unverified.');
}
