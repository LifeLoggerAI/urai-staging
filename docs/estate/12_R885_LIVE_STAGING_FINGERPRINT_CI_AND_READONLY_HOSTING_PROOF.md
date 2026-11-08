# R885 — Live Staging source fingerprint and GitHub Actions admission reconciliation

**Observation window:** November 7 (America/Chicago) / November 8, 2026 UTC. **Review-only.**
**Release verdict:** source-to-live **MISMATCH**, exact deployed artifact **UNKNOWN**, GitHub required CI **BLOCKED**, **PRODUCTION HOLD**.

Prior evidence remains in [Staging R884](11_R884_HISTORICAL_ARTIFACTS_LIVE_PARITY_AND_BRANCH_TREES.md). This addendum adds exact original source fingerprints, a public Firebase project-identity observation and an owner-safe read-only provider acceptance recipe. No production/private URL was inspected, no provider credentials were accessed, and no new deploy, build, Actions rerun, payment, identity or customer data mutation was initiated.

## 1 — Current external observations (read-only, unauthenticated)

| Public URL | Observed | Meaning / limitation |
|---|---|---|
| `https://urai-staging.web.app/` | resolved to `/home`; route presented `Home experience stalled` plus the matching home-scene error description | Exact text fingerprint; headless-browser route failure does not establish failure on every real device |
| `/robots.txt` | public crawl allowances including root and the public sample-profile route; sitemap points at `https://urai.app/sitemap.xml` | Consistent with legacy UrAi-generated robots; violates source Staging's deny-all indexing policy |
| `/api/healthz` | external fetch returned HTTP 404 | Canonical Staging handler rewrite unavailable at this public URL |
| `/api/buildinfo` | external fetch returned HTTP 404 | Cannot inspect deployed SHA/release workflow fingerprint through the intended endpoint |
| `/system-registry.json` | external fetch returned HTTP 404 | Historical/fallback registry route not live, not conclusive alone |
| `/__/firebase/init.json` | public reserved Firebase Hosting config contains `projectId: urai-staging` | **Host/hosting-project identity is supported.** This is not the Hosting release version or deployer identity |

The public init result contains client configuration that should not be copied into the audit or chat wholesale. Only `projectId` was retained.

## 2 — Precise repo source comparison: content looks like legacy UrAi, not Staging shell

| Evidence | Exact repository revision | Original path / Git blob |
|---|---|---|
| Exact live home failure title and description | `LifeLoggerAI/UrAi` main at `8cac3ba513830c11261d57bc2b5dd7ad8b83e85a` | `src/app/home/error.tsx` / `9e60b31975d0636233c6357bc8bf544f5d3fea46` |
| Live crawling allowance for root/public sample profile, production `urai.app` sitemap, API disallow | same `LifeLoggerAI/UrAi` source | `src/app/robots.ts` / `280d67ad1c2f91c03d8d42328bfb05af5d04e7c0` |
| Required Staging static root `URAI Staging — Validation Environment` with `noindex,nofollow` | `LifeLoggerAI/urai-staging` main `bda659ad23590b39e7f32de349f8a3723455ce02` | `public/index.html` / `0935582e91a68f9b63a0383eb669ea67a9401527` |
| Required staging-only `User-agent: *; Disallow: /` | same Staging main | `public/robots.txt` / `ba0e69a191f9469f94d2281116f36678abd2638c` |
| Required Hosting site `urai-staging`, static `public/` and rewrites `/api/healthz`, `/api/buildinfo` to real Functions | same Staging main | `firebase.json` / `c903e045e8b51e534b995eb5f949a7ec8bb1e01f` |
| Both Firebase aliases point only to `urai-staging` | same Staging main | `.firebaserc` / `dc92cc63382c34e5bf1553f076b605ad44188fc7` |

**Interpretation:** Public Firebase project identity aligns with the expected staging project; public page/robots content fingerprints align instead with the older Next.js `LifeLoggerAI/UrAi` source. The leading **hypothesis** is an older/different artifact or routing configuration serving the correct Hosting site. It is **not proven** that this source SHA was deployed there. Distinguish a `code-content match` from a provider-backed `deployer/commit/version` identity receipt.

**User privacy boundary:** Do not crawl/sample the public profile path, infer its owner data visibility or review any real private memories as part of staging diagnosis. A public robots allowance does not establish search engine indexing or real data exposure.

## 3 — GitHub runner admission is externally blocked; never relabel it a source-code FAIL

- Current Staging #176 combined R840 source `49d705f21a0d8370f9c6b9db5cf344b1b20a1d9b` has CI run 42335811356 and Verify 42335811359 failing with **zero recorded job steps**. No original R840 unit, full build or 23-callable check can inherit a green result from these runs.
- Docs continuation #179 source `c245a0f2b1ae16aac38b4cff3b677d81f193d460` triggered CI **42444777247** (job 128621296893) and Verify **42444777228** (job 128621296928); both failed within seconds with **zero recorded steps**. GitHub check-run output reports annotation counts (CI 2, Verify 1), but this connected GitHub endpoint cannot retrieve the annotation texts.
- GitHub main at `bda659ad23590b39e7f32de349f8a3723455ce02` reports `protected:false`; accessible repository rulesets list is empty and branch-protection detail returns 403 for the integration. Independent review on #176/#178 was not found in the inspected review results.
- A prior separate repository's public worker receipt documented an Actions account billing-lock annotation; owner-private [case #4889576](https://support.github.com/) handles account-level eligibility, payment restriction and 2FA access. **Do not publish private payment/email contents in this public repository.** Without Staging's own provider annotation, its precise runner failure cause is still unproven.
- GitHub's currently documented locked-account guide explains that an account billing lock can affect free-tier Actions and gives support/downgrade options: https://docs.github.com/en/billing/how-tos/troubleshooting/locked-account. No owner-side billing action, payment-method change or unverified self-service recovery is authorized.

## 4 — Next exact **read-only**, provider-authorized Hosting source readback

**Requires owner-authorized, least-privilege Firebase Hosting read-only identity.** The current connected GitHub/Drive tools can inspect code and email but cannot independently read authenticated Firebase Hosting release versions. The official Firebase Hosting REST API documents `sites.channels.releases.list` and `sites.versions.get` with `firebase.hosting.readonly` or `firebase.readonly` OAuth scope:
- https://firebase.google.com/docs/reference/hosting/rest/v1beta1/sites.channels.releases/list
- https://firebase.google.com/docs/reference/hosting/rest/v1beta1/sites.versions/get

**GET ONLY** on the canonical site's `live` channel:

```text
GET https://firebasehosting.googleapis.com/v1beta1/sites/urai-staging/channels/live/releases?pageSize=10

For each returned release:
  release.name / release.releaseTime / release.releaseUser / release.type
  release.version.name / release.version.status
  release.version.config.rewrites / redirects / headers
  any available source or build fingerprint in release.message or version labels

Then GET the exact release.version.name returned:
GET https://firebasehosting.googleapis.com/v1beta1/sites/urai-staging/versions/VERSION_ID
```

This is a **documented command plan, NOT executed**. If an authorized owner has read-only ADC credentials and the Google Auth Python library, the following prints only bounded, nonsecret release metadata; it does not deploy, modify billing, or create a channel:

```python
# Read-only, to run only in the owner's already-authenticated nonproduction operator environment.
import json
import google.auth
from google.auth.transport.requests import AuthorizedSession

scope = ["https://www.googleapis.com/auth/firebase.hosting.readonly"]
creds, detected_project = google.auth.default(scopes=scope)
session = AuthorizedSession(creds)
url = "https://firebasehosting.googleapis.com/v1beta1/sites/urai-staging/channels/live/releases?pageSize=10"
resp = session.get(url, timeout=20)
resp.raise_for_status()
for item in resp.json().get("releases", []):
    version = item.get("version") or {}
    config = version.get("config") or {}
    print(json.dumps({
        "release": item.get("name"),
        "releaseTime": item.get("releaseTime"),
        "releaseType": item.get("type"),
        "version": version.get("name"),
        "versionStatus": version.get("status"),
        "redirects": config.get("redirects"),
        "rewrites": config.get("rewrites"),
        "headers": config.get("headers"),
    }, sort_keys=True))
```

**Do not copy bearer tokens, private ADC files, raw identity fields, private Hosting source files or user data into a public repo.** The operator should store the complete provider receipt in the private Genesis steward registry with timestamp, release/version IDs, observed config and credential scope, then publish only a sanitized SHA/version outcome. If API returns 403, record the unmet permission; do not change IAM to force success. If it returns empty, recheck site/channel/project under authorized read-only access; do not infer no deployment without reviewing provider state.

## 5 — Decision matrix, in the right order

1. P0: Obtain authenticated *read-only* release history for `urai-staging` `live`; distinguish wrong artifact/rewrite vs expected artifact but broken routing. Cross-correlate release timestamp and actor with source candidate, deployment workflow, immutable build manifest and effective Rules/Functions revision.
2. P0: Confirm no public sample profile/private media exposure without navigating customer routes; review indexing config at source and active version. Only later, separately authorized corrective staging deploy may replace stale rules or Hosting files.
3. P0: Existing GitHub Support #4889576 must identify the account billing/runner condition and the available secure, no-new-unapproved-charge path to actual executed hosted jobs. Do not spam Actions reruns or bypass required CI.
4. P0: Run frozen **R840** source build/tests on approved zero-unapproved-cost local runner; actual 23/23 three-emulator HTTP and independent four-emulator acceptance must be original exact-head results, not donor reports.
5. P0: Finish independent reviewer/protected checks, staged source-to-build ledger and rollback, real scoped Privacy→Jobs→Studio→Replay auth/media/deletion, then real device/browser accessibility acceptance. **Separate production GO remains required.**

**HOLD means no public site mutations, cloud permissions, live consumer data, GitHub account/billing changes, production deploy or paid compute.** A STAGING PASS CANNOT AUTOMATICALLY CERTIFY PRODUCTION OR PHYSICAL DEVICES.
