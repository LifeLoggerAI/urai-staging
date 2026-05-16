# URAI Canonical Roadmap

This roadmap reconciles the requested full URAI ecosystem with the verified scope of `LifeLoggerAI/urai-staging`.

## Architecture decision

`urai-staging` is the staging backend validation repository. It should not duplicate every ecosystem app. It should provide:

1. Firebase staging configuration.
2. Firestore rules and indexes.
3. Callable backend integration points.
4. Test/emulator validation.
5. Canonical launch gates and completion matrix.
6. Cross-repo contracts for UI, spatial, studio, admin, privacy, analytics, and jobs modules.

## Already completed in this repo

- Staging backend shell.
- Firestore rules for existing staging collections.
- Callable event/flag/job primitives.
- Admin-only completion matrix callable.
- Audit, roadmap, schema, deployment, testing, and limitation docs.

## Must be implemented before launch

1. **Firebase project binding**
   - Create `.firebaserc` from `.firebaserc.example`.
   - Confirm staging project ID.
   - Verify admin custom claims path.

2. **Reproducible install/build**
   - Run `npm install` in `functions/`.
   - Commit `functions/package-lock.json`.
   - Run `npm run check` and `npm run test:e2e`.

3. **Frontend integration decision**
   - Either add staging UI here or document the exact UI repo and deployment that consumes this backend.
   - Add browser route smoke tests once UI ownership is decided.

4. **Privacy baseline**
   - Define consent collections.
   - Define retention/deletion flows.
   - Add explicit gates before passive sensing, audio, facial, mental-load, relationship, or data-marketplace features.

## Phase 1: critical build blockers

Files to edit/create:

- `.firebaserc`
- `functions/package-lock.json`
- optional `.env.example` / `functions/.env.example`

Outcome: deterministic staging project and deterministic dependency install.

## Phase 2: broken wiring and missing integrations

Files to edit/create:

- `functions/src/index.ts`
- `functions/src/lib/featureRegistry.ts`
- `firestore.rules`
- `firestore.indexes.json`
- `functions/test/*`

Outcome: callable functions, Firestore rules, indexes, and tests remain in sync.

## Phase 3: incomplete feature completion

Files to edit/create:

- `docs/URAI_MASTER_FEATURE_MATRIX.md`
- `docs/URAI_FIREBASE_SCHEMA.md`
- `functions/src/lib/featureRegistry.ts`

Outcome: every feature claim has an explicit status and owner.

## Phase 4: UI/UX cohesion

Files to edit/create:

- External UI repo or new staging UI route tree.
- UI route smoke tests.
- `docs/URAI_TESTING_CHECKLIST.md` updates.

Outcome: real user flows exercise staging backend primitives.

## Phase 5: Firebase/security/rules cleanup

Files to edit/create:

- `firestore.rules`
- `functions/test/firestore.rules.test.ts`
- `docs/URAI_PRIVACY_BASELINE.md` if privacy controls are added.

Outcome: owner/admin access and sensitive workflows are testable.

## Phase 6: tests and verification

Files to edit/create:

- `functions/package.json`
- `functions/test/*`
- `.github/workflows/ci.yml`

Outcome: CI runs typecheck, build, unit tests, and emulator rules tests.

## Phase 7: documentation and launch readiness

Files to edit/create:

- `README.md`
- `docs/URAI_DEPLOYMENT_CHECKLIST.md`
- `docs/URAI_KNOWN_LIMITATIONS.md`
- `docs/URAI_IMPLEMENTATION_LOG.md`

Outcome: operators can deploy and verify without ambiguity.

## Merge/consolidation decisions

| Overlapping Names | Canonical System |
|---|---|
| AI Narrator, Cognitive Mirror, Therapist Replay, Story Mode | Narrative Intelligence Engine |
| Shadow Cognition, Obscura Patterns, Cognitive Stress | Mental Load Intelligence System |
| Symbolic Life Map, Memory Galaxy, Constellation View | Symbolic Memory Graph |
| Mood Forecast, Recovery Timeline, Emotional Biome | Emotional Forecasting and Recovery Engine |
| Relationship intelligence, attachment, betrayal, trust | Relationship Pattern Engine |
| URAI Studio, Motion, Cinema, Music, Visuals | URAI Studio Suite |

## Post-launch candidates

- AR/VR/WebXR.
- Public gallery/community resonance.
- Data marketplace.
- Advanced cinematic exports.
- Deep relationship/deception intelligence.
- Biometric/facial environment inference.
