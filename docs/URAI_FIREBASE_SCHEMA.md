# URAI Firebase Schema

This document records the verified schema in `LifeLoggerAI/urai-staging`.

## Current collections

### `staging_users/{userId}`

Purpose: minimal staging user profile controlled by the signed-in user.

Allowed fields:

| Field | Type | Required | Notes |
|---|---|---:|---|
| `displayName` | string | No | User-facing display name. |
| `photoURL` | string | No | User avatar URL. |
| `updatedAt` | timestamp | No | Client-supplied timestamp accepted by current rules. |

Access:

- Owner can read/create/update/delete their own document.
- Other users denied.
- Admin override is not currently defined.

### `staging_events/{eventId}`

Purpose: append-only signed-in user event log for staging validation.

Allowed fields:

| Field | Type | Required | Notes |
|---|---|---:|---|
| `type` | string | Yes | 1-80 characters. |
| `payload` | map | No | Optional event payload. Callable helper caps payload key count. |
| `actorUid` | string | Yes | Must equal authenticated user UID in Firestore rules. |
| `createdAt` | timestamp | Yes | Server timestamp when written through callable. |

Access:

- Signed-in users can create events for themselves.
- Client read/update/delete denied.

### `staging_jobs/{jobId}`

Purpose: admin staging job queue.

Allowed fields:

| Field | Type | Required | Notes |
|---|---|---:|---|
| `kind` | string | Yes | 1-120 characters. Callable uses slug validation. |
| `status` | string | Yes | `queued`, `running`, `succeeded`, `failed`, `cancelled`. |
| `payload` | map | No | Optional job payload. |
| `createdAt` | timestamp | No | Set by callable. |
| `createdBy` | string | No | Set to admin UID by callable. |
| `updatedAt` | timestamp | No | For job processors/admin updates. |
| `updatedBy` | string | No | For job processors/admin updates. |

Access:

- Admins can read/create/update/delete.
- Non-admins denied.

### `staging_featureFlags/{flag}`

Purpose: admin-controlled feature flags for staging.

Allowed fields:

| Field | Type | Required | Notes |
|---|---|---:|---|
| `flag` | string | No | Must equal document ID when present. |
| `enabled` | bool | Yes | Feature flag state. |
| `description` | string | No | Optional description. |
| `updatedAt` | timestamp | No | Set by callable. |
| `updatedBy` | string | No | Admin UID. |

Access:

- Signed-in users can read.
- Admins can create/update/delete.

## Current callable functions

| Callable | Auth | Collections touched | Purpose |
|---|---|---|---|
| `healthCheck` | Public | None | Smoke check. |
| `authenticatedHealthCheck` | Signed-in user | None | Auth context check. |
| `adminHealthCheck` | Admin | None | Admin claim check. |
| `recordStagingEvent` | Signed-in user | `staging_events` | Create append-only event. |
| `getFeatureFlag` | Signed-in user | `staging_featureFlags` | Read one flag. |
| `setFeatureFlag` | Admin | `staging_featureFlags` | Create/update one flag. |
| `createStagingJob` | Admin | `staging_jobs` | Queue one job. |
| `getStagingCompletionMatrix` | Admin | None | Return roadmap/status matrix. |

## Future schema placeholders not yet implemented

The following should not be used by clients until rules, indexes, tests, and functions exist:

- `audio_sessions`
- `transcripts`
- `semantic_tags`
- `people`
- `relationships`
- `relationship_patterns`
- `mood_states`
- `mood_forecasts`
- `recovery_timelines`
- `memory_nodes`
- `symbolic_life_maps`
- `rituals`
- `mental_load_metrics`
- `obscura_patterns`
- `shadow_cognition_metrics`
- `consents`
- `data_exports`
- `marketplace_listings`
- `entitlements`
- `admin_audit_logs`

## Schema rules

1. No new collection is considered launched until it has Firestore rules, indexes if needed, tests, and documentation.
2. Sensitive inference collections must have explicit consent and deletion flows before launch.
3. Client-writable collections must validate owner UID and allowed fields.
4. AI-generated collections must store provenance, confidence, and generated timestamp.
5. Marketplace/data-sale collections require legal/privacy approval before implementation.
