import test from 'node:test';
import assert from 'node:assert/strict';
import { stagingBootstrapCommandEnvironment as runEnv } from './staging-bootstrap-command-environment.mjs';

test('launch:p0 must actually execute validations when invoked by staging bootstrap', () => {
  const input={CI:'true'};
  const result=runEnv('npm',['run','launch:p0'],input);
  assert.equal(result.URAI_P0_RUN_COMMANDS,'1');
  assert.equal(result.CI,'true');
  assert.equal(input.URAI_P0_RUN_COMMANDS,undefined,'must not mutate inherited environment');
});
test('launch:p0 cannot be forced into dry-run by incoming flag', () => {
  assert.equal(runEnv('npm',['run','launch:p0'],{URAI_P0_RUN_COMMANDS:'0'}).URAI_P0_RUN_COMMANDS,'1');
});
test('launch:p0 cannot be forced into dry-run by empty incoming flag', () => {
  assert.equal(runEnv('npm',['run','launch:p0'],{URAI_P0_RUN_COMMANDS:''}).URAI_P0_RUN_COMMANDS,'1');
});
test('other bootstrap commands inherit environment without force-enable', () => {
  for(const args of [['run','test:unit'],['run','check:deploy'],['run','launch:p0','--','--help'],['run','check:types']]) {
    const value=runEnv('npm',args,{URAI_P0_RUN_COMMANDS:'0'});
    assert.equal(value.URAI_P0_RUN_COMMANDS,'0');
  }
});
test('non-npm command never triggers launch:p0 force-enable', () => {
  assert.equal(runEnv('node',['run','launch:p0'],{}).URAI_P0_RUN_COMMANDS,undefined);
});
