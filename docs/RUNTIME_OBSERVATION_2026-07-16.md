# URAI Staging Runtime Observation — 2026-07-16

Status: **READ-ONLY OBSERVATION / PROTECTED RUNTIME NOT CERTIFIED**

## Authority

- Repository: `LifeLoggerAI/urai-staging`
- Current canonical staging main observed before this correction: `e789f57d0428c200cb131327cfce963c9ef34792`
- Truth-correction branch: `fix/staging-runtime-truth-20260716`
- Firebase project configured in source: `urai-staging`
- Hosting site configured in source: `urai-staging`
- Intended URL: `https://urai-staging.web.app`

This document does not authorize a deploy, credential use, billing action, DNS change, infrastructure creation, or production-data mutation.

## Retained observation

A credential-free historical external-smoke capture from `LifeLoggerAI/UrAi` PR #365 exact head `5f749548a18f07a113dab33201d943ec905e0858` observed:

| Target | Result |
| --- | --- |
| `https://urai-staging.web.app/` | HTTP 503 |
| `https://urai-staging.web.app/system-registry.json` | HTTP 503 |
| `https://urai-staging.web.app/api/healthz` | HTTP 503 |

Evidence:

- workflow run: `LifeLoggerAI/UrAi` run `29461602707`
- artifact: `8361398661`
- artifact digest: `sha256:f46ccc412598f52b209a58f776a8510337dd5712e1227609202ad6e574c7a470`
- artifact authority flags:
  - `historical_external_observation=true`
  - `source_containment_gate=false`
  - `credentialed=false`
  - `deployment=false`
  - `browser_certification=false`
  - `production_data_mutation=false`

## Current interpretation

Repository source contains a static staging shell, Firebase Hosting configuration, Cloud Functions handlers, rules, tests, and a protected manual deployment workflow. Repository status records do not contain a completed live-deploy receipt or a completed live-smoke receipt for the current staging environment.

Therefore the 503 response is a protected-runtime evidence gap. It does not prove that current source is defective, and it does not prove that the current source has been deployed.

The public source shell must not claim that staging is online until an exact protected receipt proves it.

## Governing issues and holds

- Runtime investigation: `LifeLoggerAI/urai-staging#20`
- External deploy-receipt issue: `LifeLoggerAI/urai-staging#10`
- Six-service source verifier: Draft PR #19 at `7467983ddaf3db1365eca58dafc6a83a170c13cd`

PR #19 intentionally holds repinning until the Admin, Privacy, and Jobs child reconciliations receive genuine independent approval, are consumed into canonical parent heads, and the resulting parent exact-head suites pass.

## Permitted next action

The next safe executable step is a checks-only run of `Staging Deploy Lock` from the exact current `main` SHA with:

- project confirmation `urai-staging`
- `run_live_deploy=false`
- no credential materialization
- no protected apply

A live staging deploy remains blocked until an authorized reviewer confirms the exact reviewed main SHA, target/site ownership, environment protection, rollback target, monitoring, recovery procedure, and receipt requirements.

## Closure evidence required

Before staging can be called live or verified, retain:

1. exact reviewed and deployed main SHA;
2. checks-only protected authority receipt;
3. Firebase project/site and deployment identity;
4. successful root, health, and build-info smoke;
5. logs and monitoring evidence;
6. recovery command and rollback target;
7. temporary-credential cleanup evidence when a credentialed deploy is explicitly authorized;
8. Release Matrix update bound to the same exact SHA.

Until those receipts exist, classification remains **PROTECTED STAGING NO-GO**.
