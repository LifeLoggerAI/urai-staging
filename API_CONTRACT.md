# URAI Staging API Contract

This file documents the public smoke API exposed by the URAI staging Firebase Hosting rewrites. These endpoints are for staging validation only and are not a production product API.

## Base URL

https://urai-staging.web.app

## Common Rules

- API responses use JSON.
- Successful responses include an ok status where applicable.
- Error responses include an error status and a stable error code.
- Unsupported methods return HTTP 405.
- Preflight requests are supported for the smoke API.

## Endpoints

| Endpoint | Method | Purpose | Expected success |
|---|---|---|---|
| /api/healthz | GET | Verify Functions routing and staging project identity. | HTTP 200 with service, projectId, and hostingUrl. |
| /api/buildinfo | GET | Verify deployed build metadata. | HTTP 200 with release candidate SHA and deploy timestamp fields. |
| /api/companion | POST | Verify companion routing and staging event write path. | HTTP 200 when message is non-empty. |
| /api/waitlist | POST | Verify staging waitlist persistence through a server-side write. | HTTP 200 when email is valid. |

## Validation Errors

| Endpoint | Invalid case | Expected error |
|---|---|---|
| /api/companion | Empty message | message_required |
| /api/waitlist | Missing or invalid email | valid_email_required |

## Hosting Smoke Routes

| Route | Expected |
|---|---|
| / | Static staging shell returns HTTP 200. |
| /u/adamclamp | Rewrites to the static shell and returns HTTP 200. |
| /robots.txt | Returns crawler exclusion rules. |

## Data Handling Notes

- Use synthetic data only for smoke tests.
- The companion endpoint stores only a truncated message preview for staging evidence.
- The waitlist endpoint writes only to staging data.
- Do not use private production user content for staging verification.
