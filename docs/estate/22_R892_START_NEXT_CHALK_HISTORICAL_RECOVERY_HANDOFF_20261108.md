# START NEXT CHALK — ONE URAI GENESIS STAGING R892 → R893

**Read this first. As-of 2026-11-08 Central / 2026-11-09 UTC. STATUS: STAGING LIVE HOLD, PRODUCTION NO-GO, PHYSICAL DEVICE UNVERIFIED.** This is the self-contained successor handoff for the staging release lane, not production authorization.

## Canonical source hierarchy / never rebuild or overwrite

- Genesis master Labs #262 (private): `docs/estate/00_START_HERE.md`, `EVIDENCE_STANDARD.md`, `WORKER_PROTOCOL.md`, `CROSS_SYSTEM_LEDGER.md`, `WORKER_INBOX.md`. Master registry governs 19 repos, cross-system authority and evidence tiers; it is not a release license.
- Staging audit lineage #177 → #178 → #179 → #181 → #182 R889 → #183 R890 → #184 R891 → **this R892**; all draft review branches stack in order, do not merge docs into source. Read original chapters 00–22, especially [R890 complete source and release architecture](17_R890_COMPLETE_CURRENT_SOURCE_BYTE_ARCHITECTURE_AND_RELEASE_GATES_20261108.md), [R891 corrected 180 tree identities](19_R891_HISTORICAL_TREE_IDENTITY_CI_AND_SOURCE_PARITY_RECONCILIATION_20261108.md), [R892 new 80-blob recovery checkpoint](21_R892_HISTORICAL_BLOB_BYTE_RECOVERY_AND_RELEASE_HOLD_20261108.md).
- Engineering lane source donors remain separate draft/unmerged: staging #173 real Storage SDK residue; #174 original three-emulator 21/21 and original suite 322/322, #175 128-node adapter 3/3; converged #176 R840 original SHA `49d705f21a0d8370f9c6b9db5cf344b1b20a1d9b`; R887 release-test enrollment #180 immutable SHA `0d9cdd67ef75071ee69a7fde1e168a1d0a263139`. Historical donor/Oct17 green ≠ current candidate 23/23 green.

## Exact authoritative identities

| Scope | Commit SHA | Actual Git tree SHA |
|---|---|---|
| default staging `main` | `bda659ad23590b39e7f32de349f8a3723455ce02` | `0e5d9500bf376026c5bb8554cf655661a0b0f7ac` |
| R840 implementation #176 | `49d705f21a0d8370f9c6b9db5cf344b1b20a1d9b` | `27122b852350441f47c793c20b05ef970cf12687` |
| R887 candidate #180 | `0d9cdd67ef75071ee69a7fde1e168a1d0a263139` | `95a120a86fe35aa4f7a1f7e4030b0fdff02fe825` |

**Important historic correction:** old R884 manifest `tree_sha` was an echo of the **commit** SHA for 180/180 heads. R891 resolved **180/180 real Git tree object SHAs**, **167 distinct actual trees**, and retained original metadata. Always use the corrected [R891 tree index](manifests/R891_CORRECTED_180_GIT_TREES_INDEX_20261108.json). R890 actual current candidate fully byte-hashed **247/247 files / 1,726,287 bytes** in 16 Git-blob+SHA256 manifests. That does not certify program behavior.

## Historical source inventory — exact recovery position, no guesswork

Historical R884 captured **180 branch heads**, 28,540 repeated path entries, **826 distinct original blob objects**, 299 unique paths, **6,984,576 unique declared Git blob bytes**, and 0 tree truncations. Do not confuse 201,390,308 repeated reference bytes with unique content. Complete history, tags and unreachable objects still unenumerated.

- R890's 247-byte-hashed candidate overlaps with **239 original historic objects / 1,673,017 bytes**.
- R892 [original 587-blob immutable worklist](manifests/R892_587_HISTORICAL_UNIQUE_BLOBS_WORKLIST.json) was generated from the R891 dedup census minus R890 already hash-verified blobs; exact worklist offsets **[0,80)** have now been fetched by GitHub object SHA and independently SHA256 hashed.
- R892 five original raw-byte manifest segments: `R892_HIST_BYTES_000_016.json`, `016_032`, `032_048`, `048_064`, `064_080`. All **80/80 checked**, **1,001,649 fetched bytes**, zero errors and zero declared-size mismatches. Each records original blob, example path, source size, actual bytes, SHA256, state, preserving private content out of manifest.
- R892 [machine checkpoint](manifests/R892_HISTORICAL_RAW_BYTE_COVERAGE_CHECKPOINT_20261108.json): combined historical corpus **319/826 unique blob bytes verified / 2,674,666 bytes**, **507 remaining historic-only unique blobs / 4,309,910 bytes**.
- **Next historical source recovery starts at exact worklist offset 80**. Create fresh manifest segments beginning `R892_HIST_BYTES_080_096.json` on an independent documentary branch or continue existing unmerged R892 branch with per-file blob SHA guard. Do NOT restart at 0, resort list, rehash existing first 80, guess missing raw source or claim 826/826 completed. Detect binary/non-UTF-8 and omit rather than lossy decoding. Prefer unique blob read once, hash with known-vector-validated SHA256 and exact byte size, record failures explicitly. This improves source estate custody; it does not clear CI, staging or launch.

## Exact current release status and provider blockers

- `.firebaserc` default/staging project `urai-staging`; Hosting site `urai-staging`, API rewrites, Node22 Functions, Firestore/Storage Rules, disposable Auth/Firestore/Storage/Functions emulators, synthetic-only consent/owner/graph and cleanup; signed private user memory lives in separately owned Privacy/Jobs/Studio/Spatial services.
- Main GitHub API `protected:false`; required independent review and effective environment policies **not proven**. R887 #180 current original CI `42447439250`, Verify `42447439206`: failed before steps, logs BlobNotFound and no artifacts; R890 docs CI `42558237798` similarly failed before steps with runner_id=0. Owner GitHub support #4889576; underlying failure not diagnosed as source or billing. No source-current R887 23/23 acceptance.
- Historic R885 public staging `/home`, robots, health/buildinfo parity mismatch pointed to old UrAi content but **live Hosting release version/deployer/source SHA unknown**; no new current authenticated provider readback. R286/R287 owner Nov1 Firebase read-only snapshot is dated and not sufficient for active hosting or IAM proof. No unauthorized deployment is proved by these symptoms.
- Functions locked Firebase Tools 15.32.1 vs deploy CLI15.23.0; exact combined toolchain not tested. Staging source governed WIF/OIDC release locks and prebuilt manifest exist but actual cloud environment policy, rollback, negative smoke and private-media source lineage have not been accepted.
- Both active protected Communications synthetic consumer entries in `config/staging-consumers.json` pin old `759f664cdf00a48272f5401b7cfc45bbd8afb537` while latest separately observed Communications main was `40cd2f4b6d422734869486a49cddac9e103a58f1` 22 ahead; source validator hardcodes old value. Require coordinated Communications/Staging owner-reviewed **config+validator+protected verification**, not unilateral edit; no evidence of an unauthorized send.
- Cross-system: Spatial browser UI, Privacy owner grants/revocation, Studio MP4/SRT private output, Jobs owner/org/quotas/late write, RuAi clinician delegation, Admin privileged/Rules publisher, Communications suppression, Labs #261 Rules collision. Refresh current PR SHAs and approvals; source or test success in one repo does not certify the other.
- **Positive integrated private lifecycle not proved**: owner-issued signed consent → Privacy grant → Studio plan → Jobs protected render → protected MP4/SRT → Spatial Replay → revocation/deletion → downstream purge/late-write deny. Physical Windows/iOS/Android/XR, reduced motion, 20+ locales, keyboard/haptics, AAA+++ visual founder signoff pending.

## Next safe runnable original test commands

Only on an **authorized no-unapproved-paid-compute** isolated Node22/Java21 host with GitHub/npm network. No GCP credentials, ADC, Firebase cloud token, customer data or production mutations. Refresh PR #180 head first, then:

```bash
git clone https://github.com/LifeLoggerAI/urai-staging.git
cd urai-staging
git fetch origin 0d9cdd67ef75071ee69a7fde1e168a1d0a263139
git checkout --detach 0d9cdd67ef75071ee69a7fde1e168a1d0a263139
test "$(git rev-parse HEAD)" = "0d9cdd67ef75071ee69a7fde1e168a1d0a263139"
test -z "$(git status --porcelain --untracked-files=all)"
test -z "${GOOGLE_APPLICATION_CREDENTIALS:-}"
test -z "${FIREBASE_TOKEN:-}"
node --version
java -version
node --test scripts/test-r887-release-acceptance-wiring.mjs
npm --prefix functions ci --ignore-scripts --engine-strict --audit=false
npm run test:r816:capacity
npm --prefix functions run test:synthetic-lifecycle:http-emulator
npm run check
npm run check:deploy
```

Capture exact original source SHA/tree, tool versions, install result, TAP/exit/log SHA256, test count, synthetic project `urai-staging-test`, no residual objects. Three-emulator callable 23-check proof is separate from authentic four-emulator R451. A missing authorized runner/failed dependency is NOT RUN rather than PASS/FAIL. Then independent protected CI, owner-scoped GET-only Hosting live revisions/Rules/IAM/Functions/WIF/billing/rollback, engineer-reviewed Communications pin/Rules publisher, separately approved staging mutation and smoke/rollback, source-bound private movie, real physical devices and **separate independent production GO**. A staging PASS must **never** be promoted to production/device certification.

## R892 provenance / no-actions

Only GitHub original tracked/blob reading and new audit-only stacked docs; no source PR was modified or merged, no GitHub Actions re-run/dispatch, cloud deploy, IAM/Rules, service credentials, billing, paid compute, private media, external provider messages, staging or production mutation. All previously built work preserved. **Release HOLD**.
