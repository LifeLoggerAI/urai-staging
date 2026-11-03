import { createHash } from 'node:crypto';
import type { JobsLifeMovieSource, JobsLifeMovieTimelineItem, JobsLifeMovieAudioCue } from './studio-life-movie-jobs-bridge';

/** Pinned to Jobs main 9d29be1bcd3a45a4b9a743df9c9706c00811f38b.
 * Jobs remains authoritative for SceneTruth signatures, segmentation and execution.
 */
export const STUDIO_LONGFORM_JOBS_CONTRACT = {
  jobsSourceSha: '9d29be1bcd3a45a4b9a743df9c9706c00811f38b',
  schemaVersion: 'urai-life-movie-longform-v1',
  maxDurationMs: 45 * 60 * 1000,
  maxSegmentDurationMs: 15_000,
  maxSegments: 180,
  maxSources: 128,
  maxTimelineItems: 360,
  maxAudioCues: 720,
  maxChildSources: 12,
  maxChildTimelineItems: 12,
  maxChildAudioCues: 12,
  maxRequestBytes: 512 * 1024,
  actions: ['create', 'status', 'cancel', 'playback', 'download', 'resume', 'assemble', 'delete-output'],
} as const;

const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const RECEIPT = /^str_[A-Za-z0-9_-]{16,64}_[a-z0-9]{8,16}_[A-Za-z0-9_-]{40,64}$/;
const PLAN_ID = /^lmp_[A-Za-z0-9_-]{20,64}$/;
const MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm', 'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/x-wav', 'audio/webm', 'audio/ogg']);
const PROVENANCE = new Set(['original-source', 'user-provided-fact', 'verified-metadata', 'user-recorded-memory', 'inferred', 'reconstructed', 'generated', 'artistic-interpretation', 'unknown']);
const AUDIO_ROLES = new Set(['narration', 'dialogue', 'music', 'ambience', 'foley', 'effects']);

export class StudioLongformError extends Error {
  code: string;
  status: number;
  constructor(code: string, status = 400) { super(code); this.code = code; this.status = status; }
}

function fail(code: string): never { throw new StudioLongformError(code); }
function record(value: unknown, allowed: string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('longform_invalid_request');
  const object = value as Record<string, unknown>;
  if (Reflect.ownKeys(object).some((key) => typeof key !== 'string' || !allowed.includes(key))) fail('longform_unknown_request_field');
  return object;
}
function text(value: unknown, max: number, code: string): string {
  if (typeof value !== 'string' || !value || value.trim() !== value || value.length > max) fail(code);
  return value;
}
function id(value: unknown, code: string): string {
  const result = text(value, 128, code); if (!ID.test(result)) fail(code); return result;
}
function integer(value: unknown, min: number, max: number, code: string): number {
  if (!Number.isSafeInteger(value) || Number(value) < min || Number(value) > max) fail(code);
  return Number(value);
}
function path(value: unknown): string {
  const result = text(value, 1024, 'longform_invalid_source_path');
  if (result.startsWith('/') || result.includes('..') || result.includes('\\')) fail('longform_invalid_source_path');
  return result;
}
function array(value: unknown, min: number, max: number, code: string): unknown[] {
  if (!Array.isArray(value) || value.length < min || value.length > max) fail(code);
  return value;
}
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${canonical(object[key])}`).join(',')}}`;
  }
  const result = JSON.stringify(value);
  if (result === undefined) fail('longform_non_json_plan');
  return result;
}

// Jobs clips valid SRT cues into child ranges; reject syntax it cannot parse.
function assertSubtitleSyntax(value: string) {
  const normalized = value.replace(/\r\n?/g, '\n').trim();
  if (!normalized) return;
  const parseTime = (input: string) => {
    const match = /^(\d{2}):(\d{2}):(\d{2}),(\d{3})$/.exec(input);
    if (!match || Number(match[2]) > 59 || Number(match[3]) > 59) fail('longform_invalid_subtitles');
    return (((Number(match[1]) * 60 + Number(match[2])) * 60 + Number(match[3])) * 1000) + Number(match[4]);
  };
  for (const block of normalized.split(/\n{2,}/)) {
    const lines = block.split('\n');
    const timingIndex = lines[0]?.includes('-->') ? 0 : 1;
    const match = /^(\d{2}:\d{2}:\d{2},\d{3})\s+-->\s+(\d{2}:\d{2}:\d{2},\d{3})(?:\s+.*)?$/.exec(String(lines[timingIndex] || '').trim());
    if (!match || !lines.slice(timingIndex + 1).join('\n').trim()) fail('longform_invalid_subtitles');
    if (parseTime(match[2]) <= parseTime(match[1])) fail('longform_invalid_subtitles');
  }
}

export type StudioLongformPlanAction = 'status' | 'cancel' | 'playback' | 'download' | 'resume' | 'assemble' | 'delete-output';
export type StudioLongformRequest =
  | { action: 'create'; tenantId: string; userId: string; idempotencyKey: string; consent: { purpose: 'life-movie.render'; policyVersion: string; decisionReceiptId: string }; payload: Record<string, unknown> }
  | { action: StudioLongformPlanAction; tenantId: string; userId: string; planId: string };

export function buildStudioLongformRequest(value: unknown, identity: { tenantId: string; userId: string }): StudioLongformRequest {
  const tenantId = id(identity.tenantId, 'longform_invalid_tenant');
  const userId = id(identity.userId, 'longform_invalid_owner');
  const body = record(value, ['action', 'planId', 'projectId', 'sceneTruthReceiptRef', 'sceneTruthDigest', 'sources', 'timeline', 'audioCues', 'subtitleText', 'width', 'height', 'fps', 'consent']);
  if (body.action !== 'create') {
    const plan = record(body, ['action', 'planId']);
    if (!STUDIO_LONGFORM_JOBS_CONTRACT.actions.includes(plan.action as StudioLongformPlanAction) || plan.action === 'create') fail('longform_invalid_action');
    const planId = text(plan.planId, 68, 'longform_invalid_plan_id');
    if (!PLAN_ID.test(planId)) fail('longform_invalid_plan_id');
    return { action: plan.action as StudioLongformPlanAction, tenantId, userId, planId };
  }
  record(body, ['action', 'projectId', 'sceneTruthReceiptRef', 'sceneTruthDigest', 'sources', 'timeline', 'audioCues', 'subtitleText', 'width', 'height', 'fps', 'consent']);
  const projectId = id(body.projectId, 'longform_invalid_project');
  const sceneTruthReceiptRef = text(body.sceneTruthReceiptRef, 152, 'longform_invalid_scene_truth_receipt');
  if (!RECEIPT.test(sceneTruthReceiptRef)) fail('longform_invalid_scene_truth_receipt');
  const sceneTruthDigest = text(body.sceneTruthDigest, 64, 'longform_invalid_scene_truth_digest');
  if (!/^[a-f0-9]{64}$/.test(sceneTruthDigest)) fail('longform_invalid_scene_truth_digest');
  const consentInput = record(body.consent, ['purpose', 'policyVersion', 'decisionReceiptId']);
  if (consentInput.purpose !== 'life-movie.render') fail('longform_render_consent_required');
  const consent = {
    purpose: 'life-movie.render' as const,
    policyVersion: text(consentInput.policyVersion, 80, 'longform_invalid_consent'),
    decisionReceiptId: text(consentInput.decisionReceiptId, 160, 'longform_invalid_consent'),
  };
  // The transport shape must match Jobs #232 and the Privacy 1.1.0 receipt
  // policy. A correctly shaped hash is never itself proof of authorization.
  if (consent.policyVersion !== '1.1.0' || !/^[0-9a-f]{64}$/.test(consent.decisionReceiptId)) {
    fail('longform_invalid_consent');
  }
  const width = integer(body.width ?? 1920, 320, 1920, 'longform_invalid_width');
  const height = integer(body.height ?? 1080, 320, 1080, 'longform_invalid_height');
  const fps = integer(body.fps ?? 30, 24, 30, 'longform_invalid_fps');
  if (width % 2 || height % 2 || ![24, 25, 30].includes(fps)) fail('longform_invalid_dimensions');
  const sourceIds = new Set<string>();
  const sources = array(body.sources, 1, 128, 'longform_invalid_sources').map((value) => {
    const source = record(value, ['id', 'bucket', 'objectPath', 'generation', 'mimeType', 'provenance', 'sourceRefs', 'consentRef', 'ownerOrRightsRef']);
    const sourceId = id(source.id, 'longform_invalid_source_id');
    if (sourceIds.has(sourceId)) fail('longform_duplicate_source_id');
    sourceIds.add(sourceId);
    const bucket = text(source.bucket, 255, 'longform_invalid_bucket');
    if (bucket.length < 3 || !/^[a-z0-9][a-z0-9._-]+[a-z0-9]$/.test(bucket)) fail('longform_invalid_bucket');
    const objectPath = path(source.objectPath);
    if (![`studios/${tenantId}/`, `tenants/${tenantId}/`].some((prefix) => objectPath.startsWith(prefix))) fail('longform_source_outside_tenant');
    // Bound each source to an immutable object generation, exactly as the
    // Jobs validator and installed Storage SDK require. No latest-object fallback.
    const generation = text(source.generation, 20, 'longform_invalid_source_generation');
    if (!/^[1-9][0-9]{0,19}$/.test(generation) || !Number.isSafeInteger(Number(generation))) {
      fail('longform_invalid_source_generation');
    }
    if (!MIME.has(String(source.mimeType)) || !PROVENANCE.has(String(source.provenance))) fail('longform_invalid_source_metadata');
    return {
      id: sourceId, bucket, objectPath, generation, mimeType: source.mimeType, provenance: source.provenance,
      sourceRefs: array(source.sourceRefs, 1, 32, 'longform_invalid_source_refs').map((ref) => text(ref, 512, 'longform_invalid_source_ref')),
      consentRef: id(source.consentRef, 'longform_invalid_source_consent'),
      ownerOrRightsRef: id(source.ownerOrRightsRef, 'longform_invalid_source_rights'),
    } as JobsLifeMovieSource;
  });
  const timeline: JobsLifeMovieTimelineItem[] = array(body.timeline, 1, 360, 'longform_invalid_timeline').map((value) => {
    const item = record(value, ['sourceId', 'startMs', 'endMs', 'sourceStartMs']);
    const sourceId = id(item.sourceId, 'longform_invalid_timeline_source');
    if (!sourceIds.has(sourceId)) fail('longform_unknown_timeline_source');
    const startMs = integer(item.startMs, 0, STUDIO_LONGFORM_JOBS_CONTRACT.maxDurationMs, 'longform_invalid_timeline_start');
    const endMs = integer(item.endMs, 1, STUDIO_LONGFORM_JOBS_CONTRACT.maxDurationMs, 'longform_invalid_timeline_end');
    if (endMs <= startMs || endMs - startMs > 15_000) fail('longform_pre_cut_source_required');
    if (item.sourceStartMs !== undefined) {
      const sourceStartMs = integer(item.sourceStartMs, 0, 45 * 60 * 1000, 'longform_invalid_timeline_source_start');
      if (sources.find((source) => source.id === sourceId)!.mimeType.startsWith('image/') && sourceStartMs !== 0) {
        fail('longform_image_source_start_must_be_zero');
      }
      return { sourceId, startMs, endMs, sourceStartMs };
    }
    return { sourceId, startMs, endMs };
  }).sort((left, right) => left.startMs - right.startMs);
  if (timeline.some((item, index) => index > 0 && item.startMs < timeline[index - 1].endMs)) fail('longform_overlapping_timeline');
  const totalMs = timeline[timeline.length - 1].endMs;
  const audioCues: JobsLifeMovieAudioCue[] = array(body.audioCues ?? [], 0, 720, 'longform_invalid_audio_cues').map((value) => {
    const cue = record(value, ['sourceId', 'role', 'startMs', 'endMs', 'sourceStartMs', 'gainDb']);
    const sourceId = id(cue.sourceId, 'longform_invalid_audio_source');
    const source = sources.find((item) => item.id === sourceId);
    if (!source || !(source.mimeType.startsWith('audio/') || source.mimeType.startsWith('video/'))) fail('longform_audio_source_not_audio_capable');
    if (!AUDIO_ROLES.has(String(cue.role))) fail('longform_invalid_audio_role');
    const startMs = integer(cue.startMs, 0, totalMs, 'longform_invalid_audio_start');
    const endMs = integer(cue.endMs, 1, totalMs, 'longform_invalid_audio_end');
    if (endMs <= startMs) fail('longform_invalid_audio_duration');
    const sourceStartMs = integer(cue.sourceStartMs ?? 0, 0, 45 * 60 * 1000, 'longform_invalid_audio_offset');
    const gainDb = cue.gainDb ?? 0;
    if (typeof gainDb !== 'number' || !Number.isFinite(gainDb) || gainDb < -60 || gainDb > 12) fail('longform_invalid_audio_gain');
    return { sourceId, role: cue.role as JobsLifeMovieAudioCue['role'], startMs, endMs, sourceStartMs, gainDb };
  });
  // Mirror Jobs' timeline-anchored greedy ranges. Fixed 0/15-second windows
  // cannot predict the real child when the first clip begins between windows.
  const ranges: { startMs: number; endMs: number; items: JobsLifeMovieTimelineItem[] }[] = [];
  let current: (typeof ranges)[number] | null = null;
  for (const item of timeline) {
    if (!current) { current = { startMs: item.startMs, endMs: item.endMs, items: [item] }; continue; }
    const canAppend = item.endMs - current.startMs <= STUDIO_LONGFORM_JOBS_CONTRACT.maxSegmentDurationMs
      && item.startMs - current.endMs <= STUDIO_LONGFORM_JOBS_CONTRACT.maxSegmentDurationMs
      && current.items.length < STUDIO_LONGFORM_JOBS_CONTRACT.maxChildTimelineItems;
    if (!canAppend) { ranges.push(current); current = { startMs: item.startMs, endMs: item.endMs, items: [item] }; }
    else { current.items.push(item); current.endMs = item.endMs; }
  }
  if (current) ranges.push(current);
  if (ranges.length > STUDIO_LONGFORM_JOBS_CONTRACT.maxSegments) fail('longform_segment_count_exceeded');
  for (const range of ranges) {
    const cues = audioCues.filter((cue) => cue.startMs < range.endMs && cue.endMs > range.startMs);
    const ids = new Set([...range.items, ...cues].map((item) => item.sourceId));
    if (cues.length > STUDIO_LONGFORM_JOBS_CONTRACT.maxChildAudioCues
      || ids.size > STUDIO_LONGFORM_JOBS_CONTRACT.maxChildSources) fail('longform_child_budget_exceeded');
  }
  const subtitleText = body.subtitleText ?? '';
  if (typeof subtitleText !== 'string' || subtitleText.length > 8 * 1024 * 1024) fail('longform_invalid_subtitles');
  assertSubtitleSyntax(subtitleText);
  const plan = { projectId, sceneTruthReceiptRef, sceneTruthDigest, outputPrefix: `tenants/${tenantId}/life-movies/${projectId}/`, width, height, fps, sources, timeline, audioCues, subtitleText };
  const renderPlanDigest = createHash('sha256').update(canonical(plan)).digest('hex');
  return {
    action: 'create', tenantId, userId, idempotencyKey: `life-movie-longform:${renderPlanDigest}`, consent,
    payload: { schemaVersion: STUDIO_LONGFORM_JOBS_CONTRACT.schemaVersion, ...plan, renderPlanDigest, spatialRequired: false, publicReleaseAuthorized: false, providerGenerationAuthorized: false },
  };
}

export async function readStudioLongformJson(message: Request | Response, maxBytes: number, signal?: AbortSignal): Promise<unknown> {
  const length = Number(message.headers.get('content-length'));
  if (Number.isFinite(length) && length > maxBytes) throw new StudioLongformError('longform_request_too_large', 413);
  if (!message.body) fail('longform_invalid_request');
  const reader = message.body.getReader();
  // Cancel the owned reader as well as fetch. A response whose headers have
  // arrived must not keep a pending read alive beyond the bridge deadline.
  const abortRead = () => { void reader.cancel().catch(() => undefined); };
  if (signal?.aborted) abortRead();
  else signal?.addEventListener('abort', abortRead, { once: true });
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (signal?.aborted) throw new StudioLongformError('longform_request_aborted', 499);
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) { await reader.cancel(); throw new StudioLongformError('longform_request_too_large', 413); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch (error) {
    if (error instanceof StudioLongformError) throw error;
    throw new StudioLongformError('longform_invalid_json');
  } finally { signal?.removeEventListener('abort', abortRead); reader.releaseLock(); }
}
