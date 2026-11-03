import test from 'node:test';
import assert from 'node:assert/strict';
import { stagingEvidenceTimingProblems } from './staging-evidence-timing.mjs';
const iso = n => new Date(Date.parse('2026-11-03T05:00:00.000Z') + n).toISOString();
const report = () => ({ startedAt:iso(0), finishedAt:iso(6000), commands:[
  { command:'alpha', startedAt:iso(1000), finishedAt:iso(2000) },
  { command:'beta', startedAt:iso(2000), finishedAt:iso(4000) },
  { command:'gamma', startedAt:iso(5000), finishedAt:iso(5000) },
] });
test('valid sequential bootstrap timestamps accepted',()=> assert.deepEqual(stagingEvidenceTimingProblems(report()),[]));
test('missing report rejected',()=> assert.ok(stagingEvidenceTimingProblems(null).length));
test('missing top-level completion rejected',()=> {const r=report();r.finishedAt=null;assert.ok(stagingEvidenceTimingProblems(r).length)});
test('reversed report interval rejected',()=> {const r=report();r.finishedAt=iso(-1);assert.ok(stagingEvidenceTimingProblems(r).length)});
test('non-canonical date text rejected',()=> {const r=report();r.startedAt='Nov 3, 2026';assert.ok(stagingEvidenceTimingProblems(r).length)});
test('missing command completion rejected',()=> {const r=report();r.commands[1].finishedAt=null;assert.ok(stagingEvidenceTimingProblems(r).length)});
test('command cannot finish before starting',()=> {const r=report();r.commands[1].finishedAt=iso(1999);assert.ok(stagingEvidenceTimingProblems(r).length)});
test('command cannot overlap a preceding command',()=> {const r=report();r.commands[1].startedAt=iso(1999);assert.ok(stagingEvidenceTimingProblems(r).length)});
test('command cannot run outside bootstrap window',()=> {const r=report();r.commands[2].finishedAt=iso(6001);assert.ok(stagingEvidenceTimingProblems(r).length)});
test('unparseable calendar dates rejected',()=> {const r=report();r.commands[0].startedAt='2026-13-99T05:00:00.000Z';assert.ok(stagingEvidenceTimingProblems(r).length)});
test('empty command list does not masquerade as inventory validation',()=> {const r=report();r.commands=[];assert.deepEqual(stagingEvidenceTimingProblems(r),[])});
