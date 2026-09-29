# URAI API / Provider / World / Captured-Reality Live Audit Receipt — 2026-09-25

Status: **PARTIAL / FAIL-CLOSED — NOT ZERO REMAINDER**

This receipt records the live authority observed during the 2026-09-25 autonomous audit. It intentionally records no secret values.

## Evidence established

- Asset Factory convergence PR #284 implements modality-specific provider routing and adapters for OpenAI, Replicate, fal, ElevenLabs, Stability, Runway and Meshy. Its exact-head workflows were green when inspected, but its own authority explicitly keeps provider selectors at local-proof and spend authorization false.
- The Model Forge credential-presence workflow on PR #284 reported `MESHY_API_KEY`, `TRIPO_API_KEY`, `RODIN_API_KEY` and `REPLICATE_API_TOKEN` absent in ordinary pull-request Actions. This does **not** prove protected production secret storage is empty; it proves those credentials were not injected into that PR job.
- Asset Factory pipeline proof recorded zero provider calls and no deployment. Production visual authority remained blocked, including retained visuals that are not yet provider-backed.
- Runway account authentication and paid credit availability were independently read back without spending credits. The source integration still lacks a certified protected-runtime generation smoke.
- HeyGen account authentication was independently read back; the connected account reported a free plan and no certified private founder voice/model.
- Gmail evidence established current account/billing activity for Anthropic, Gemini/AI Studio, xAI, Runway, ElevenLabs, HeyGen, Meshy, Tripo, Move AI, fal, Twilio, and KIRI account verification. Billing/account evidence is not treated as application integration.
- Communications source implements Twilio/Resend/SendGrid/Firebase delivery adapters and remains fail-closed behind real-delivery activation.
- Captured Reality governance exists in Asset Factory PR #294 and private browser/runtime work exists in Spatial PRs #1314/#1316. No real reconstructed scene, fVDB worker, KIRI executor, Postshot Gold Master or public release is certified.
- The current Maps bootstrap workflow is deliberately governed to Maps JavaScript + Geocoding only. Its pull-request read-only GCP audit job was skipped on the inspected run because the required dedicated WIF variables were not available. Static workflow-contract success is not cloud-state proof.
- The geographic UI truthfully remains a fallback and says interactive Google Maps will load only after restricted keys are configured. The broader Maps/Cesium world stack is therefore not yet runtime-certified.
- No canonical-default-branch source matches were found for KIRI, fVDB, Postshot, Cesium, Move AI, `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`, or `XAI_API_KEY`. That is source-wiring evidence only, not a statement about external secret storage.

## Repairs executed during this audit

On Spatial PR #1316, the audit repaired three current exact-head test/harness defects:

1. aligned stale Focus v395 stellar contract assertions to the current source values;
2. hardened canonical journey attribute reads and Home screenshots against animated-root stability waits;
3. fixed XR contract file-reader scope (`readFile is not defined`).

The current PR head after these repairs is expected to receive fresh CI; predecessor results do not transfer.

## Security boundary

- No API key, token, client secret or credential value was written to this receipt.
- Paid provider generation was not authorized or executed.
- Stripe LIVE was not mutated.
- Google/Firebase production authentication remains WIF/ADC-first; long-lived service-account JSON remains prohibited in the canonical production path.
- A source scan found no obvious Anthropic key prefix match. A documented OpenAI-looking prefix occurs in a credential-containment receipt, and Firebase-style browser API-key prefixes exist in generated/public Firebase configuration; these require classification, not automatic rotation. No secret value is reproduced here.

## Zero-remainder result

**NOT ACHIEVED.** The estate has substantial provider implementation and strong fail-closed governance, but funded/account-created is materially ahead of protected runtime binding, live non-destructive verification, full world-stack integration, and real captured-reality execution. The canonical machine-readable registry for this audit is `config/provider-registry-20260925.json`.
