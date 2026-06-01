# URAI Genesis Staging Readiness

Last updated: 2026-06-01

## Purpose

This repository is the pre-production validation layer for URAI Genesis. Staging should prove that the main app loop works before promotion to production.

## Source of truth

Primary implementation source: `LifeLoggerAI/UrAi`

Genesis app files that staging must validate:

- `src/app/home-view.tsx`
- `src/lib/urai/types.ts`
- `src/lib/urai/consent.ts`
- `src/lib/urai/genesis.ts`
- `src/lib/urai/storage.ts`
- `src/lib/urai/signal-pipeline.ts`
- `src/lib/urai/sound.ts`
- `docs/URAI_GENESIS_GAP_MAP.md`

## Required staging smoke tests

Staging cannot be considered ready until these pass against the staging deploy URL:

```txt
[ ] Home route renders without crashing.
[ ] Orb opens and closes chat.
[ ] Passport panel opens.
[ ] Permissions panel opens.
[ ] Consent toggles update UI state.
[ ] Bloom Moment creates a new signal/reflection/memory star.
[ ] Memory star opens its reflection card.
[ ] Life Map navigation target exists or fails gracefully.
[ ] Firebase write succeeds when staging env vars are configured.
[ ] localStorage fallback works when Firebase config is absent.
```

## Command matrix

Run from the app repo before staging promotion:

```bash
npm install
npm run check:v1
npm run check:genesis
npm run check:firestore-contract
npm run check:types
npm run lint
npm run test:unit
npm run build
npm run test:smoke
npm run ship:urai:staging
npm run test:smoke:staging
```

## Environment requirements

Staging should use isolated Firebase resources:

- Firebase project: `urai-staging`
- Hosting site: `urai-staging`
- Firestore rules deployed from the app repo
- No production user data
- Seed data only when clearly separated from live data

## Promotion gate

Only promote Genesis to production after:

- Staging smoke tests pass.
- The Genesis Firestore tree is protected by rules.
- No user-facing demo/debug/test labels are visible.
- Passport and permissions copy matches the privacy repo.
- Sound assets either exist or missing-sound behavior is confirmed harmless.
