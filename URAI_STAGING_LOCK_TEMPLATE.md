# URAI Staging Lock Evidence Template

Use this file as the checklist for a verified staging deploy. The deploy script writes `URAI_STAGING_LOCK.md` after a successful deploy and smoke run; this template defines the required evidence fields that should be preserved for release review.

## Release Identity

- Repository: `LifeLoggerAI/urai-staging`
- Firebase project: `urai-staging`
- Firebase Hosting site: `urai-staging`
- Staging URL: `https://urai-staging.web.app`
- Release candidate SHA: `<commit-sha>`
- Deployed at UTC: `<timestamp>`
- Deployed by: `<operator>`

## Required Predeploy Evidence

| Check | Required command | Result |
|---|---|---|
| Dependency install | `npm --prefix functions ci` | `<pass/fail>` |
| Deploy readiness | `npm run check:deploy` | `<pass/fail>` |
| Lint | `npm run lint` | `<pass/fail>` |
| Typecheck | `npm run typecheck` | `<pass/fail>` |
| Build | `npm run build` | `<pass/fail>` |
| Unit tests | `npm run test:unit` | `<pass/fail>` |
| Emulator/rules tests | `npm run test:e2e` | `<pass/fail>` |

## Required Deploy Evidence

| Check | Required command | Result |
|---|---|---|
| Firebase active project | `firebase use` | `<urai-staging confirmed>` |
| Firebase deploy | `npm run deploy:staging` | `<pass/fail>` |
| Live smoke | `npm run smoke:staging` | `<pass/fail>` |

## Required Live Smoke Endpoints

| Endpoint | Method | Expected |
|---|---|---|
| `/` | GET | 200 |
| `/u/adamclamp` | GET | 200 |
| `/api/healthz` | GET | 200 |
| `/api/buildinfo` | GET | 200 |
| `/api/companion` valid body | POST | 200 |
| `/api/companion` empty message | POST | 400 |
| `/api/waitlist` synthetic email | POST | 200 |

## Release Decision

- Launch readiness score: `<score>`
- Remaining risks: `<none or listed>`
- Rollback command: `firebase hosting:clone urai-staging:<previous-version> urai-staging:live --project urai-staging`
- Final decision: `<locked / not locked>`
