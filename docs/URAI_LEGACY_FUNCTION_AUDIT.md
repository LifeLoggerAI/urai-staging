# URAI Legacy Deployed Function Audit

## Context

During Firebase deployment to project `urai-staging`, the Firebase CLI reported deployed functions that are not present in this repository's current local source code.

The deployment prompt was answered with **No** to avoid deleting potentially live staging behavior.

## Legacy functions currently deployed but not owned by this source tree

| Function | Region | Current action | Rationale |
|---|---|---|---|
| `health` | `us-central1` | Preserve until audited | May be an older health endpoint used by existing clients or monitors. |
| `onEventCreated` | `us-central1` | Preserve until audited | Likely event trigger from an earlier URAI pipeline. |
| `onInsightCreated` | `us-central1` | Preserve until audited | Likely insight trigger from an earlier analytics/narrative pipeline. |
| `onMemoryCreated` | `us-central1` | Preserve until audited | Likely memory trigger from an earlier timeline/memory system. |
| `onNarrativeCreated` | `us-central1` | Preserve until audited | Likely narrative trigger from an earlier story/narrator system. |
| `onSignalCreated` | `us-central1` | Preserve until audited | Likely signal trigger from an earlier passive-data system. |
| `submitSignal` | `us-central1` | Preserve until audited | Likely callable or HTTPS ingestion endpoint for signals. |
| `replay` | `us-central1` | Preserve until audited | Likely replay endpoint from an earlier timeline/narrative flow. |

## Current repo-owned deployed functions

These functions are owned by `LifeLoggerAI/urai-staging/functions/src/index.ts`:

- `healthCheck`
- `authenticatedHealthCheck`
- `adminHealthCheck`
- `recordStagingEvent`
- `getFeatureFlag`
- `setFeatureFlag`
- `createStagingJob`
- `getStagingCompletionMatrix`

## Policy

Do not delete legacy deployed functions during routine staging deploys until one of the following is true:

1. The function source has been found in another repo and ownership has been documented.
2. The function has been intentionally migrated into `urai-staging`.
3. The function has been confirmed unused by clients, triggers, schedules, dashboards, or monitoring.
4. A rollback plan has been created.

## Recommended audit steps

1. Run:

   ```bash
   firebase functions:list --project urai-staging
   ```

2. Check whether each function is callable, HTTPS, Firestore-triggered, Pub/Sub-triggered, or scheduled.
3. Search all URAI repos for each function name.
4. Search frontend/client code for callable or HTTPS usage.
5. Review Firebase logs for recent invocations.
6. Decide one of:
   - import into `urai-staging`,
   - move to the correct owning repo,
   - preserve as externally owned,
   - retire with a deletion plan.

## Open decision

Until the above audit is complete, always answer **No** when the Firebase CLI asks whether to delete these functions.
