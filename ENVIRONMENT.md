# URAI Staging Environment

## Required runtime

- Node.js 20
- npm
- Java 21 for Firebase emulator tests
- Firebase CLI `15.23.0` in the protected deploy job

## Firebase project binding

`.firebaserc` must keep only the nonproduction aliases:

```json
{
  "projects": {
    "default": "urai-staging",
    "staging": "urai-staging"
  }
}
```

A `production` alias is prohibited. Staging commands must not have a local alias or environment selector capable of targeting production.

## Canonical staging surface

- Project: `urai-staging`
- Hosting site: `urai-staging`
- URL: `https://urai-staging.web.app`
- Public directory: `public`
- SPA fallback: `public/index.html`

The Hosting site must already exist. Release automation must fail rather than create infrastructure.

## Non-secret staging variables

| Variable | Required value | Purpose |
|---|---|---|
| `URAI_STAGING_PROJECT_ID` | `urai-staging` | Canonical staging project. |
| `URAI_STAGING_URL` | `https://urai-staging.web.app` | Canonical smoke target. |
| `URAI_RELEASE_CANDIDATE_SHA` | exact current `main` SHA | Deployed identity. |
| `URAI_PRODUCTION_DEPLOY_APPROVED` | `0` | Production must remain disabled. |
| `URAI_STAGING_PROTECTED_DEPLOY` | `1` only in the protected deploy job | Prevents local or ad hoc deploys. |

## Local source and emulator work

Local environments may run noncredentialed checks only:

```bash
npm --prefix functions ci
npm run check:deploy
npm run check
npm run test:rules
npm run test:e2e
```

Local environments must not run the staging deploy command. The lock script deliberately rejects execution outside its protected GitHub Actions job.

## Protected deployment

The only deploy authority is `.github/workflows/staging-deploy.yml`, dispatched from `main` with:

- the exact current `main` SHA;
- project confirmation `urai-staging`;
- checks-only mode first;
- live-deploy mode only after accepted review and evidence.

The credentialed job uses the GitHub `staging` environment and reads `FIREBASE_SERVICE_ACCOUNT_URAI_STAGING`. The credential is written only beneath `RUNNER_TEMP`, used for the exact deploy, and removed afterward.

## Secrets and data

No production API key, provider key, Firebase credential, or private user data belongs in this repository. Staging verification and smoke tests must use synthetic data. Production deployment is outside this repository's authority.