# Staging diagnostic route repair

The observed live Hosting version has 306 assets and a pinned `ssruraistaging`
Cloud Run fallback. The repository's static `public` deployment is not an
equivalent replacement. Do not use a full `firebase deploy --only hosting` to
repair only `/api/healthz` and `/api/buildinfo`.

`healthz` now reports the same source identity fields as `buildinfo`. These
fields describe the diagnostic Functions deployment, not the SSR application's
source. A successful diagnostic response alone does not verify the SSR journey.

Run the offline checks with:

```sh
node --test scripts/test-diagnostics-preservation.mjs
node scripts/plan-diagnostics-preservation.mjs input.json > plan.json
```

The input must include `expectedSourceSha` (40-character reviewed commit),
`version` (the full finalized live Hosting API version including `config` and
`fileCount`), `files` (all pages of its path/hash inventory), and `diagnostics`
containing verified direct `healthz` and `buildinfo` response bodies. Both direct
responses must identify that reviewed source commit and the staging project.
Summarized readbacks, missing identities, duplicate assets, and unpinned SSR
fallbacks are rejected. The planner does not call a provider or deploy anything.

The returned configuration inserts the two diagnostic Function rewrites before
the existing rewrites and retains the complete remainder of the live config.
Its sorted asset-inventory digest must match the eventual candidate inventory.
The deployment operator must preserve every original path/hash, verify the live
version has not changed, and satisfy the existing release/approval gates before
creating a release. The exact provider copy/finalization operation remains a
separate reviewed deployment change; this script is not a deployment executor.

After an approved release, verify hosted and direct diagnostic source identities,
unchanged asset inventory and SSR revision/tag, and the actual application
journey. Rollback must point to the prior immutable live version. No production
release is authorized by this document or by a successful offline plan.
