# URAI Staging Environment

## Required Runtime

- Node.js: 20
- Package manager: npm
- Firebase CLI: required for deploy and emulator commands
- Java: required for Firestore emulator tests

## Firebase Project Binding

`.firebaserc` must keep:

```json
{
  "projects": {
    "default": "urai-staging",
    "staging": "urai-staging",
    "production": "urai-4dc1d"
  }
}
```

The deploy script refuses to deploy unless the staging project is `urai-staging`.

## Hosting

- Hosting site: `urai-staging`
- Default URL: `https://urai-staging.web.app`
- Public directory: `public`
- SPA fallback: `public/index.html`

## Optional Environment Variables

| Variable | Default | Purpose |
|---|---|---|
| `URAI_STAGING_PROJECT_ID` | `urai-staging` | Must remain `urai-staging` for staging lock and smoke scripts. |
| `URAI_STAGING_URL` | `https://urai-staging.web.app` | Live smoke target URL. |
| `URAI_RELEASE_CANDIDATE_SHA` | current git SHA or `unknown` | Stamped into buildinfo and lock report. |
| `URAI_DEPLOYED_AT` | deploy-time UTC timestamp | Stamped into buildinfo and lock report. |
| `URAI_PRODUCTION_DEPLOY_APPROVED` | `0` | Must not be `1` during staging deploy. |

## Functions

Functions use Firebase Admin SDK default credentials inside Firebase. Local emulator runs use Firebase emulator credentials and project binding.

## Local Setup

```bash
npm --prefix functions ci
npm run check:deploy
npm run check
```

## Emulator Setup

```bash
npm run emulators
npm run test:e2e
```

In Firebase Studio or IDX, rebuild the workspace if Java is missing. The Java dependency is provided through Nix.

## Deploy Setup

```bash
firebase login
firebase use urai-staging
npm run deploy:staging
```

## Secrets

No production API keys, AI provider keys, or private user data should be committed to this repo. Staging smoke tests should use synthetic data only.
