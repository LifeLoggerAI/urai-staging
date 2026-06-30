# Blockers and Completion Plan

Date: 2026-06-30
Repo: LifeLoggerAI/urai-staging

## Readiness score

Score: 75 / 100

Rationale:
- Strong static staging architecture, scripts, docs, route map, and environment separation are present.
- Stale env example was fixed during this pass.
- Public staging disclaimer was added to the hosted shell.
- `robots.txt` exists and disallows indexing.
- Final lock still cannot be granted until install, lint, typecheck, build, tests, Firebase deploy, and live smoke outputs are generated from a credentialed environment.

## P0 blockers

1. Produce real command evidence from a fresh checkout.
   - `npm install`
   - `npm --prefix functions ci`
   - `npm run doctor`
   - `npm run check:deploy`
   - `npm run check:lockfile`
   - `npm run lint`
   - `npm run typecheck`
   - `npm run build`
   - `npm run test:unit`
   - `npm run test:rules` or `npm run test:e2e`

2. Produce Firebase-authenticated deploy proof.
   - `firebase login`
   - `firebase use urai-staging`
   - `npm run deploy:staging`
   - Commit generated `URAI_STAGING_LOCK.md` after successful deploy.

3. Produce live smoke proof.
   - `npm run smoke:staging`
   - Confirm JSON endpoints are Functions responses, not SPA fallback HTML.
   - Use only synthetic staging data.

## P1 blockers

1. Full secret scanning.
   - Run a real scanner such as Gitleaks or GitHub secret scanning review across history.
   - GitHub text search found no common secret indicators in this pass, but that is not complete history scanning.

2. CI status confirmation for the latest branch head.
   - Confirm the `CI` workflow passes after this proof-folder, env-example, and public disclaimer updates.
   - The workflow runs bootstrap and launch evidence validation, so it must be checked after the generated evidence files exist.

3. Confirm live Hosting and Functions DNS from at least one external network.
   - The assistant container could not resolve `urai-staging.web.app`; this may be a sandbox DNS limitation, but it means this pass cannot certify the live site.

## P2 blockers

1. Tighten CORS if smoke endpoints ever handle private data.
   - Current permissive CORS is acceptable only for smoke/public staging endpoints.

2. Confirm staging data retention policy.
   - `staging_waitlist` stores email addresses; smoke tests should use synthetic addresses only.
   - Define deletion/retention cadence for staging collections.

3. Add CI artifact upload for launch evidence if not already enabled.
   - Preserve command logs and summary as workflow artifacts.

## P3 follow-ups

1. Add a README badge or section showing latest CI/deploy-lock status after CI is passing.
2. Consider adding a short screenshot or visual smoke receipt after the next successful staging deploy.

## Completed during this pass

1. `.env.example` now uses canonical staging values: `urai-staging` and `https://urai-staging.web.app`.
2. `public/index.html` now includes a visible staging disclaimer: not production, not launch, synthetic data only.
3. `public/robots.txt` was verified to disallow indexing for all user agents.
4. Timestamped proof folder was created under `launch-proof/urai-staging-production-lock/2026-06-30T0000Z/`.

## Completion plan

1. Pull latest `main` after this pass.
2. Run local bootstrap from a clean environment.
3. Fix any lint/type/test failure without weakening rules.
4. Run deploy lock only against `urai-staging`.
5. Commit `URAI_STAGING_LOCK.md` plus command logs under a timestamped proof folder.
6. Verify GitHub Actions CI status after all proof files are committed.
7. Only then mark staging lock READY.

## No-go statements

Do not claim:
- Staging is production.
- Full URAI product UI is complete from this repo.
- Firebase deploy passed unless `URAI_STAGING_LOCK.md` is generated from a real deploy.
- Live smoke passed unless `npm run smoke:staging` output is captured.
- Staging data is safe for real user data.
