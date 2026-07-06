# URAI Staging Audit Summary — 2026-07-06

Repository: `LifeLoggerAI/urai-staging`  
Canonical branch: `main`  
Audited main SHA: `6bc20ddc8f9a658a2195c94e79c0349ef79b8728`

## Verdict

This repository is the Firebase staging backend, validation shell, security-rules source, test harness, and release-evidence workspace for URAI. It is not the full URAI product UI or spatial application.

The staging foundation is implemented, but the audited head is not fully certified. A historical Firebase deploy receipt exists, while current-head CI and deployment evidence are absent. The historical build endpoint returned unknown release metadata, public write APIs need stronger access and cost controls, the completion matrix has drifted from the repository's actual ownership, and rollback is not proven.

## Verified foundation

- Firebase project and Hosting site are locked to `urai-staging`.
- The production Firebase alias was removed from this repository.
- Hosting, Functions, Firestore rules/indexes, Storage rules, and emulator configuration exist.
- Firestore and Storage use default-deny fallbacks.
- Callable auth and admin guards exist.
- Firestore rule tests cover owner, admin, append-only event, feature-flag, job, and default-deny behavior.
- A visible non-production shell and crawler block exist.
- CI and a manual staging deploy-lock workflow exist.

## Current blockers

1. Produce a passing CI artifact for the current head.
2. Make `/api/buildinfo` report the exact deployed SHA and deployment time.
3. Add approved-caller and cost controls to public write APIs.
4. Upgrade the deprecated Node 20 Functions runtime and old Firebase SDK.
5. Establish one exact deployed SHA and one tested rollback SHA.
6. Resolve ownership of Functions deployed in the staging Firebase project but absent from this repository.
7. Align the completion matrix with this repository's backend and validation responsibilities.

## Audit changes

Branch: `audit/release-evidence-hardening-20260706`

- Changed Functions bootstrap installation from `npm install` to deterministic `npm ci`.
- Removed the unnecessary root install from the bootstrap path.
- Added a readiness assertion that prevents the bootstrap from reverting to non-deterministic Functions installation.
- Expanded issue #8 for exact build/deployment metadata evidence.
- Created issue #12 for public staging write API controls.
- Created issue #13 for completion-matrix source-of-truth repair.

## Completion standard

The repository is staging-complete only after current-head CI passes, the exact deployed and rollback SHAs are recorded, live smoke checks prove concrete build metadata, public writes are bounded and tested, staging data has a cleanup policy, supported runtime versions are deployed, monitoring exists, and every deployed Function has a canonical source repository and owner.
