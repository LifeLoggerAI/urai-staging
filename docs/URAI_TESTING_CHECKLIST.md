# URAI Testing Checklist

## Local backend checks

Run from `functions/`:

```bash
npm install
npm run typecheck
npm run build
npm run test:unit
npm run test:e2e
npm run check
```

## Unit checks

- [ ] Auth helper rejects unauthenticated calls.
- [ ] Auth helper accepts signed-in users.
- [ ] Admin helper rejects non-admin users.
- [ ] Admin helper accepts `role=admin` custom claim.
- [ ] Validation rejects arrays/null for object inputs.
- [ ] Validation trims and bounds strings.
- [ ] Validation rejects unsafe slugs.
- [ ] Feature registry uses approved status labels.
- [ ] Feature registry does not mark unverified product modules complete.

## Firestore rules checks

- [ ] Owner can read/write own `staging_users/{uid}`.
- [ ] Non-owner cannot read/write another user's `staging_users/{uid}`.
- [ ] Signed-in user can create valid `staging_events` for own UID.
- [ ] User cannot create `staging_events` for another UID.
- [ ] Client cannot read/update/delete `staging_events`.
- [ ] Admin can read/create/update/delete `staging_jobs`.
- [ ] Non-admin cannot access `staging_jobs`.
- [ ] Signed-in user can read `staging_featureFlags`.
- [ ] Non-admin cannot write `staging_featureFlags`.
- [ ] Admin can write `staging_featureFlags`.
- [ ] Unknown collections are denied by default.

## Callable smoke checks after deploy

- [ ] `healthCheck` returns `status=ok` without auth.
- [ ] `authenticatedHealthCheck` returns the caller UID.
- [ ] `adminHealthCheck` returns `role=admin` for admins.
- [ ] `recordStagingEvent` creates an event and returns an event ID.
- [ ] `getFeatureFlag` returns `exists=false` for missing flags.
- [ ] `setFeatureFlag` creates/updates a flag as admin.
- [ ] `createStagingJob` queues a job as admin.
- [ ] `getStagingCompletionMatrix` returns summary, phases, and matrix as admin.

## UI checks

Blocked until a staging UI exists or an external UI repo is formally connected.

When available, add checks for:

- [ ] Route existence.
- [ ] Navigation links.
- [ ] Component imports.
- [ ] Loading states.
- [ ] Empty states.
- [ ] Error states.
- [ ] Mobile responsiveness.
- [ ] Feature-flag behavior.
- [ ] Authenticated and unauthenticated flows.

## Production-readiness checks

- [ ] `.firebaserc` points to staging.
- [ ] No secret values are committed.
- [ ] CI passes.
- [ ] Emulator rules tests pass.
- [ ] Firestore indexes deploy successfully.
- [ ] Admin claims have been manually verified.
- [ ] Sensitive modules remain disabled until consent/privacy flows exist.
