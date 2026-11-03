import test from 'node:test';
import assert from 'node:assert/strict';
import { privacyJobsStagingAdmissionProblems as check } from './validate-privacy-jobs-staging-admission.mjs';
const staged = () => ({
  projectId: 'urai-staging', environment: 'staging', productionAllowed: false,
  consumers: ['LifeLoggerAI/urai-privacy', 'LifeLoggerAI/urai-jobs'].map((repository, i) => ({
    id: `test-${i}`, repository, state: 'active', sourceRef: 'refs/heads/reviewed',
    exactSha: (i ? 'b' : 'a').repeat(40), providerProject: 'urai-staging', allowedEnvironment: 'staging',
    dataPolicy: 'synthetic-only', productionDeploymentAuthorized: false,
    productionDataAuthorized: false, longLivedCredentialsAuthorized: false,
    projectWideRuleMutationAuthorized: false, hostingMutationAuthorized: false,
    allowedDeployScopes: ['functions-explicit-only'],
  })),
});
const subject = (fn) => { const value = staged(); fn(value); return check(value); };
test('synthetic source-only staging pair passes structural admission only', () => assert.deepEqual(check(staged()), []));
test('communications-only active registry blocks Genesis Privacy/Jobs', () => {
  const errors = subject(x => { x.consumers = [{ repository:'LifeLoggerAI/urai-communications', state:'active' }]; });
  assert.equal(errors.length, 2);
});
test('missing registry fails closed', () => assert.ok(check(null).length));
test('production identity is rejected even when both consumers match', () => assert.ok(subject(x => x.projectId = 'urai-4dc1d').length));
test('real owner data forbidden for staging contract', () => assert.ok(subject(x => x.consumers[1].dataPolicy = 'real-user-data').length));
test('Production Jobs project cannot be selected for staging', () => assert.ok(subject(x => x.consumers[1].providerProject = 'urai-jobs').length));
test('wrong consumer environment rejected', () => assert.ok(subject(x => x.consumers[0].allowedEnvironment = 'production').length));
test('missing approval state is not active', () => assert.ok(subject(x => x.consumers[0].state = 'pending').length));
test('duplicate active receiver is rejected', () => assert.ok(subject(x => x.consumers.push({...x.consumers[1],id:'duplicate'})).length));
test('untrusted missing exact source SHA rejected', () => assert.ok(subject(x => x.consumers[0].exactSha = '').length));
test('project-wide rule deployment cannot be silently granted', () => assert.ok(subject(x => x.consumers[1].projectWideRuleMutationAuthorized = true).length));
test('hosting and production deployment must be disabled explicitly', () => assert.ok(subject(x => {delete x.consumers[0].hostingMutationAuthorized;x.consumers[1].productionDeploymentAuthorized = true}).length));
test('Functions-only scope cannot be replaced by Hosting', () => assert.ok(subject(x => x.consumers[1].allowedDeployScopes = ['hosting']).length));
test('source ref required even with valid SHA', () => assert.ok(subject(x => x.consumers[0].sourceRef = '').length));
