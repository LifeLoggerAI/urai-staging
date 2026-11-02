import assert from 'node:assert/strict';
import test from 'node:test';
import {
  stagingBootstrapCommands, stagingBootstrapCommandTexts,
  hasExactStagingBootstrapInventory,
} from './staging-bootstrap-command-manifest.mjs';

const fullyPassed = () => stagingBootstrapCommandTexts.map(command => ({
  command, status: 'passed', exitCode: 0,
}));
test('bootstrap and validator share the original ordered 15-check inventory', () => {
  assert.equal(stagingBootstrapCommands.length, 15);
  assert.equal(stagingBootstrapCommandTexts.length, 15);
  assert.equal(stagingBootstrapCommandTexts[0],
    'node --test scripts/test-twilio-trial-sender.mjs scripts/test-sendgrid-staging-budget.mjs');
  assert.equal(stagingBootstrapCommandTexts[14], 'npm run launch:p0');
  assert.ok(hasExactStagingBootstrapInventory(fullyPassed()));
});
test('one synthetic successful check cannot represent all 15 checks', () => {
  assert.equal(hasExactStagingBootstrapInventory([{command:'synthetic checks',status:'passed',exitCode:0}]),false);
});
test('truncated 100-percent-pass report cannot establish complete acceptance', () => {
  const commands=fullyPassed().slice(0,14);
  assert.equal(commands.every(c=>c.status==='passed'),true);
  assert.equal(hasExactStagingBootstrapInventory(commands),false);
});
test('substituted, reordered and duplicated commands fail closed', () => {
  const original=fullyPassed();
  const substituted=original.map(c=>({...c}));substituted[5].command='echo passed';
  assert.equal(hasExactStagingBootstrapInventory(substituted),false);
  const reordered=original.map(c=>({...c}));[reordered[1],reordered[2]]=[reordered[2],reordered[1]];
  assert.equal(hasExactStagingBootstrapInventory(reordered),false);
  const duplicated=original.map(c=>({...c}));duplicated[2].command=duplicated[1].command;
  assert.equal(hasExactStagingBootstrapInventory(duplicated),false);
});
test('missing and malformed inventories fail closed', () => {
  for(const value of [null,undefined,{},false,'passed',[],[null]])
    assert.equal(hasExactStagingBootstrapInventory(value),false);
});
