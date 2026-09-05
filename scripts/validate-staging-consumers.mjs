import fs from 'node:fs';

const path = new URL('../config/staging-consumers.json', import.meta.url);
const doc = JSON.parse(fs.readFileSync(path, 'utf8'));
const failures = [];

if (doc.schemaVersion !== 'urai-staging-consumers-1') failures.push('schemaVersion');
if (doc.projectId !== 'urai-staging') failures.push('projectId');
if (doc.environment !== 'staging') failures.push('environment');
if (doc.mutationAuthorityRepository !== 'LifeLoggerAI/urai-staging') failures.push('mutationAuthorityRepository');
if (doc.productionAllowed !== false) failures.push('productionAllowed');
if (!Array.isArray(doc.consumers) || doc.consumers.length !== 1) failures.push('consumers');

const c = doc.consumers?.[0] || {};
if (c.repository !== 'LifeLoggerAI/urai-admin') failures.push('consumer repository');
if (c.repositoryId !== 1150887043) failures.push('consumer repositoryId');
if (c.pullRequest !== 57) failures.push('consumer pullRequest');
if (c.exactSha !== 'fb255310d6b183a59e4252da80c685f45e5cf536') failures.push('consumer exactSha');
if (c.sourceRef !== 'refs/pull/57/head') failures.push('consumer sourceRef');
if (c.providerProject !== 'urai-staging') failures.push('consumer providerProject');
if (c.allowedEnvironment !== 'staging') failures.push('consumer allowedEnvironment');
if (c.dataPolicy !== 'synthetic-only') failures.push('consumer dataPolicy');
if (c.productionDeploymentAuthorized !== false) failures.push('consumer productionDeploymentAuthorized');
if (c.productionDataAuthorized !== false) failures.push('consumer productionDataAuthorized');
if (c.longLivedCredentialsAuthorized !== false) failures.push('consumer longLivedCredentialsAuthorized');
if (c.projectWideRuleMutationAuthorized !== false) failures.push('consumer projectWideRuleMutationAuthorized');
const scopes = new Set(c.allowedDeployScopes || []);
for (const scope of ['functions-explicit-only', 'hosting-preview-only']) if (!scopes.has(scope)) failures.push(`missing ${scope}`);
for (const forbidden of ['firestore', 'storage', 'production', 'generic-source']) if (scopes.has(forbidden)) failures.push(`forbidden ${forbidden}`);

if (failures.length) {
  console.error(`staging consumer authority invalid: ${failures.join(', ')}`);
  process.exit(1);
}
console.log('staging consumer authority contract OK');
