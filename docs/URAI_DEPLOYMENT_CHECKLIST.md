# URAI Deployment Checklist

## Hard gates

Do not deploy until every item in this section is complete.

- [ ] Confirm the Firebase staging project ID.
- [ ] Create `.firebaserc` from `.firebaserc.example`.
- [ ] Confirm authenticated admin custom claims use `role=admin`.
- [ ] Run `npm install` from `functions/`.
- [ ] Commit `functions/package-lock.json` after first verified install.
- [ ] Run `npm run typecheck` from `functions/`.
- [ ] Run `npm run build` from `functions/`.
- [ ] Run `npm run test:unit` from `functions/`.
- [ ] Run `npm run test:e2e` from `functions/`.
- [ ] Confirm `firebase deploy --only functions,firestore --project staging` targets the staging project, not production.

## Environment and secrets

No secrets should be committed to this repository.

Required manual setup before future product modules:

- [ ] Firebase project ID.
- [ ] Firebase service permissions.
- [ ] Admin custom-claim assignment process.
- [ ] Transcription provider key, if audio transcription is added.
- [ ] LLM provider key, if AI narrator/tagging is added.
- [ ] TTS provider key, if voice narration is added.
- [ ] Email/SMS provider keys, if notifications are added.
- [ ] Payment provider keys, if Pro/marketplace features are added.
- [ ] Analytics provider keys, if dashboards are externally instrumented.

## Deploy command

```bash
cd functions
npm run check
npm run test:e2e
cd ..
firebase deploy --only functions,firestore --project staging
```

## Post-deploy smoke checks

- [ ] Call `healthCheck` unauthenticated.
- [ ] Call `authenticatedHealthCheck` as a signed-in user.
- [ ] Call `adminHealthCheck` as an admin.
- [ ] Call `getStagingCompletionMatrix` as an admin.
- [ ] Verify non-admin users cannot call admin functions.
- [ ] Verify signed-in user can read feature flags.
- [ ] Verify admin can set feature flags.
- [ ] Verify signed-in user can create staging events.
- [ ] Verify staging events cannot be read/updated/deleted from clients.
- [ ] Verify default-deny catches unknown collections.

## Rollback

If deployment fails or smoke checks fail:

1. Stop release-candidate validation.
2. Record the failing command and output in `docs/URAI_IMPLEMENTATION_LOG.md`.
3. Revert the failing commit or redeploy the last known-good commit.
4. Re-run `npm run check` and `npm run test:e2e` before another deploy.
