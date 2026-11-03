# URAI Cross-Repo Release Map

## Scope and release authority

`LifeLoggerAI/urai-staging` owns the Firebase staging backend, validation shell,
rules, functions, and staging-only smoke/lock evidence. It is NOT the full UrAi
consumer application and has no production Firebase alias or release authority.

The canonical production application is `LifeLoggerAI/urai-spatial`, runtime root
`urai-tier1`, served at `https://urai.app` after the separate governed release.
This source-of-truth relationship does not certify any currently deployed SHA.
The historic `LifeLoggerAI/UrAi` repository is quarantined as a legacy/reference
source, and must never be selected as an active production or staging UI owner.

## Source owners and acceptance boundaries

| Role | Repository | Runtime root | Target | Accepted evidence required |
| --- | --- | --- | --- | --- |
| Canonical public consumer | `LifeLoggerAI/urai-spatial` | `urai-tier1` | `https://urai.app` | Exact-head CI, actual browser/WebGL and device journey, independent review, governed deploy and founder Home acceptance |
| Firebase staging backend | `LifeLoggerAI/urai-staging` | `.` | `https://urai-staging.web.app` | Protected WIF deployment, Firebase emulator and live isolation smoke, monitoring and rollback |
| Life Movie consent authority | `LifeLoggerAI/urai-privacy` | `functions` | Protected callable only | Trusted scoped user-grant issuer, exact Jobs identity, signed/verified identity, deletion and revocation proof |
| Jobs and governed workers | `LifeLoggerAI/urai-jobs` | `functions` | Protected worker only | Source rights, per-boundary consent, service identity, generation fences and replay-safe cancellation |
| Private media Studio | `LifeLoggerAI/urai-studio` | `.` | Private media only | Authenticated Jobs/Privacy processing, output ownership, private delivery and deletion proof |
| Legacy/reference only | `LifeLoggerAI/UrAi` | `historical` | `none` | No product deployment or production authority; retain history and migration evidence only |

Other repositories, including RuAi/B2B, Foundation and institutional operations,
retain distinct owning release gates. The active Staging consumer registry is a
scoped allowlist, not proof that every UrAi repository is integrated or deployed.
Its source of truth remains `config/staging-consumers.json`; this map never
silently changes active consumers, grants protected mutation, or pins a moving PR.

## Current open release trackers

- Integrated HOLD coordination: https://github.com/LifeLoggerAI/urai-staging/issues/116
- Canonical public Home visual acceptance: https://github.com/LifeLoggerAI/urai-spatial/issues/863
- Canonical app current source and deployment policy: `LifeLoggerAI/urai-spatial/README.md`
- Staging backend checklist: `URAI_STAGING_DEFINITION_OF_DONE.md`

Historical Core Web staging coordination at `LifeLoggerAI/UrAi#286` and the closed
Staging issue #6 remain provenance; neither authorizes a current product build,
staging lock, merge, or production release. The actual open PR heads, hosted CI,
independent reviews, provider receipts, and deployed SHA must be fetched anew.

## Final decision rule

NO-GO / HOLD until the currently accepted exact source heads pass full original
suites, authenticated cross-service and privacy checks, protected staging,
native user journey, independent review and founder-governed release gates.
Staging source-only tests, old receipts, legacy status docs and HTTP 200 routes
are NOT substitutes for deployed system-of-systems acceptance.
