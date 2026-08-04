# URAI Technical Agent Handoff — 2026-08-04

## Purpose

This is the durable technical handoff for the current URAI ecosystem state. Another AI agent, engineer, reviewer, or trusted collaborator should begin here and then re-read every referenced GitHub authority before acting.

This document is not a production-completion certificate. It distinguishes source-green, emulator-green, protected-staging, deployed, and publicly live states. Older handoff documents and older SHA-bound evidence remain historical only.

## Canonical public product authority

- Repository: `LifeLoggerAI/urai-spatial`
- Application root: `urai-tier1`
- Protected production branch: `main`
- Frozen main SHA: `cc5809337c4185fa9e50806924820abb16e1b533`
- Current production-release authority: issue `LifeLoggerAI/urai-spatial#999`
- Repository convergence: complete
- Governance candidate evidence: 25/25 workflows successful
- Current public verdict: `BLOCKED — EXTERNAL ACCOUNT AND PROTECTED RELEASE GATES`

Merged convergence chain:

- Mirror PR #1026 -> `81bc0694bbad8abe02de9e34b3fac6b6277ade8c`
- Geography replacement PR #1034 -> `2c22eb8256425cce242ff61d3a2c732d492e3c5e`
- Governance replacement PR #1035 -> `cc5809337c4185fa9e50806924820abb16e1b533`

Do not move `main` without invalidating the freeze and rebuilding the complete release evidence chain.

## Remaining public-release sequence

The source and exact-head evidence are complete. The remaining sequence is external and protected:

1. Complete Squarespace identity verification and account recovery under `LifeLoggerAI/urai-labs-llc#46`.
2. Renew/reactivate `urai.app`, `urai.life`, `geturai.app`, `geturai.life`, `ruai.app`, and `ruai.life`.
3. Retain redacted paid receipts, active status, expiration dates, registrar lock and nameserver evidence.
4. Verify authoritative DNS, Firebase custom-domain routing, TLS and mail records.
5. Confirm `https://urai.app/release-fingerprint.json` is reachable and valid.
6. Re-resolve `main` immediately before dispatch and require exact SHA `cc5809337c4185fa9e50806924820abb16e1b533`.
7. Run exactly one protected `DEPLOY_URAI_APP` release against the frozen SHA.
8. Retain terminal route, desktop, mobile, accessibility, privacy, resource, console, network, fingerprint and rollback evidence.
9. Obtain exact deployed Location Map acceptance under `urai-spatial#872`.
10. Change public language from preview/readiness to live only after every gate passes.

Billing is not the current blocker. Canonical billing health was accepted in `LifeLoggerAI/urai-labs-llc#48`.

## Core service source authority

All heads below must be re-fetched before acting. Automated review is supporting evidence only; it does not satisfy a genuine non-author approval requirement.

### Admin

- Parent PR #45: `65dc35efa6ef0f460273f0892214cb07e71c8ef0`
- RBAC/session reconciliation PR #52: `7953f6e66244eddf7543f4c9136f1e041bf4fbc1`
- Machine state: source/build behavior green
- Remaining: genuine non-author security approval, bounded parent consumption, full parent rerun, protected Auth/registry apply/read-back/isolation/monitoring/recovery/rollback

### Privacy

- Parent PR #82: `ff741bd52534ca60135bd1fa997f9ffd1e930f4b` and intentionally diverged from current main pending decisions
- Deletion orchestration reconciliation PR #100: `667cfb0fec4ab13af94e590365e43767e2f9eb2b`
- Machine state: 5/5 exact-head workflows green; root and Functions lockfiles remediated and critical-level production audits passed
- Remaining: genuine privacy/security and authorized legal/privacy approval, later current-main reconstruction, authenticated protected-staging consent/export/deletion, cross-user denial, residual scans, downstream acknowledgements, failure/retry, monitoring, recovery and rollback

### Jobs

- Canonical worker/deployment parent PR #75: `3f0b87d692ba0e4de2d24098fa0766fadc600e98`
- V1-V5/runtime reconciliation PR #77: `56115290f097d2db2563df328aeac91caeca6a38`
- Reliability completion PR #78: `39a676835590795afec64d8f7304b5c40c68c419`
- Firebase CLI pin PR #80: `6edbd6430ee4167837e2f491b074d43a1892a759`
- Machine state: applicable source and Auth/Firestore/Functions emulator evidence green
- Remaining: independent supply-chain/security review, serialized consumption, Pub/Sub topic and IAM proof, Cloud Run worker revision/identity, live dispatch/retry/dead-letter/monitoring/recovery/rollback

### Content

- Rules authority PR #66: `227df755844fb5c192dd8298f3e130f0e84f29cc`
- Prompt release PR #67: `1af6da8854b2a9457fe67bd6ee11e5c4855fb199`
- Machine state: rules/static/emulator green; prompt fixture evidence green but not release-eligible
- Remaining: independent rule review, protected Firebase identity allow/deny proof and rollback; prompt target-model runs, retained raw outputs, independent manual checks, human approval, merge/tag and Drive mirror verification

### Analytics

- Trust-core parent PR #28: `5bf2b2a578b80d05227e8a07e41846d68ff60938`
- Cumulative B2B analytics PR #33: `459db7406487f2b2c20e9e0724cbac23e0af0050`
- Durable replay PR #34: `224d631324635277ca12a1ecbbf21898b80026d6`
- Machine state: exact-head source/test/build evidence green
- Remaining: genuine privacy/security/deployment review, serialized parent consumption, protected Firestore duplicate/conflict/environment/CAS/TTL/outage/recovery/rollback proof and exact deployed identity

### Communications

- Callback-hardening parent PR #27: `961fb10299643f60efff5e33913a2967c9fab5cb`
- Production-lock reconciliation PR #28: `180cbab717c858b553440944c1a47ee16d547983`
- Launch operations PR #34: `f1d307102b76e8d2339c8f9a9ce2e659ccc2e4ff`
- Machine state: source/test/emulator green; real delivery disabled
- Remaining: independent security/privacy review, provider-native webhook proof, consent/opt-out/quiet-hours/caps/allowlists/kill-switch staging, legal approval, monitoring/recovery/rollback, and separately authorized one-recipient provider canary before any broader send

## Staging authority

- Protected staging source PR #17: `7f3a46e8df884b694a2cbefa4e60a74da18d5745`
- Six-service credential-free integration PR #19: `7467983ddaf3db1365eca58dafc6a83a170c13cd`
- Runtime truth PR #21: `c72461a00ac9fdd42292459827467a3ef2cb4e81`

PR #19 intentionally retains canonical parent SHAs rather than unapproved child heads. It must be rebuilt and repinned only after approved child changes are consumed into their canonical parents and every resulting parent exact-head suite passes.

Protected staging must remain synthetic/test-data only until exact project/site, least-privilege credentials, environment reviewers, checks-only proof, separately approved apply, read-back, isolation, denial, monitoring, failure, recovery and rollback receipts exist.

## Wider ecosystem authority

- B2B Portal parent #17: `49a911f788843012bc7220f7c0d43f9aa4e90560`; Foundation correction #22: `0f96efaf6878d49a4bfd2b2ded5aeb1c3cd43da2`
- Studio release truth #64: `abd19d5b68f334c9d95b3c5fe928e4027b68c927`; private memory film contract #66: `40832bbe740d991ed61b9348d89f27133dd4eb22`
- Asset Factory paid-authority repair #228: `ef3c738de02fed4fd2ef17dd2e1eb1df446edaf1`
- Storytime public share #25: `af544ebe144539fd425a2b8a0887aeebb98556a1`; canonical root #26: `2a78ff5c41b5b361f2abe7bb4732138cc6a966ca`; FINITE TIME canon #28: `699b254367731b8a074cd99f010a1be1454ef5ef`; release workflow #30: `16e3baf346b0dbcf4b32df09292e95c0a0a9af8e`
- Marketing supply-chain PR #24: `ce91c08ccf4e9f1f9dc03d3e882d0f4aa59d2d3c`; launch canon #26 remains documentation authority pending evidence/legal reconciliation
- Investor parent #11: `05366c06ffd69f93af37fe6e67cea40ace860e8d`; document-scoped child #16: `d75933aaacc12cd8885b8de602d5b7f834c8cef2`
- Legacy `UrAi` quarantine PR #370: `1f9e53088cbb81ef1c56e560cdbed514170de472`; legacy repository must never regain canonical production authority

Each wider lane has independent privacy, legal, provider, identity, spend, deployment or protected-runtime gates. Do not treat source-green status as ecosystem-live status.

## Google Drive control state

The workbook `URAI Launch Control — 2026-07` remains historical and contains stale July PR rows. Two August 4 warnings were added to:

- `WSF PR Control!A2:P120`
- `Stakeholders!A2:L20`

Do not use old workbook rows as merge/deployment authority. GitHub exact heads and retained current evidence are authoritative until a new verified August control view is written.

## Reviewer boundary

The current Stakeholders registry still lists the Security owner and the Trust/legal/operations approval group as unnamed/TBD. Codex COMMENTED reviews and automated checks may find defects but cannot satisfy required genuine human approvals.

Do not self-approve, fabricate reviewer identity, or convert an automated review into an `APPROVED` human review.

## Required resume procedure

1. Read `urai-spatial#999` and verify frozen main.
2. Check the Squarespace recovery thread and domain status.
3. Re-fetch every PR head before using any SHA in this document.
4. Fetch exact-head workflow runs, review submissions and unresolved review threads.
5. Treat all evidence from older heads as historical.
6. Repair only defects proven by source, logs, retained artifacts, screenshots or provider read-back.
7. Advance machine-owned source, test, documentation and readiness work without bypassing approvals.
8. Stop at genuine non-author approval, secure owner identity, legal/privacy, provider spend, protected-environment or external-account gates.
9. Never deploy, send, spend, mutate real-user data, activate providers or change public live claims without the lane's explicit authority.
10. Record every material state change in GitHub and then reconcile Drive.

## Truth rules

Never claim:

- merged when unmerged;
- deployed when only built;
- live when only staged;
- production-certified when only source/emulator green;
- independently approved when reviewed by the author, automation or an unnamed party;
- rollback-protected without a tested distinct-revision rollback receipt;
- provider-ready without provider-backed evidence;
- whole ecosystem live while required private services, DNS, legal or protected runtime gates remain open.

## Current verdict

- Canonical public application source and repository convergence: `GREEN / FROZEN`
- Public production release: `BLOCKED BY SQUARESPACE, DOMAINS AND PROTECTED DEPLOYMENT`
- Core service source authority: `LARGELY GREEN / UNMERGED`
- Protected six-service staging: `NO-GO`
- Wider ecosystem production certification: `NO-GO`
- Real communications delivery: `DISABLED`
- Risky capabilities: remain fail-closed until their own gates close
