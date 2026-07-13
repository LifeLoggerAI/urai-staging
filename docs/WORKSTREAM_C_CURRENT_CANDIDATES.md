# Workstream C current exact candidates

Recorded from the live pull-request heads on July 13, 2026:

- Admin: `2ee6574ff9b54b50d2d82293ddeba5643af61bf7`
- Privacy: `95ad07b5920c0c6a940a2f5390a3e470bf334367`
- Jobs: `f3a772a5c0d0a02524b00dc47253b0f24391ffd2`

The authoritative machine-readable pins are in `scripts/workstream-c-current-candidates.env`.

Use only these official entrypoints:

- `scripts/run-workstream-c-cloud-shell.sh`
- `scripts/run-workstream-c-manual-verification.sh`
- `scripts/repair-jobs-unused-error-reporting.sh`

The corresponding `*-core.sh` files are implementation details and must not be invoked directly. The official wrappers validate the shared exact candidates, preserve explicit caller overrides for confined pre-push verification, and invoke the audited cores.

The manual verifier defaults to zero GitHub publication. Any summary publication requires explicit `WORKSTREAM_C_PUBLISH_SUMMARY=1`, a fully passing verifier, authenticated GitHub CLI access, and a successful issue write.

The Jobs repair operator defaults to local verification only. Remote publication additionally requires `JOBS_REPAIR_PUBLISH=1` and `JOBS_REPAIR_PUBLISH_CONFIRM=PUBLISH_VERIFIED_JOBS_REPAIR` after the exact local candidate passes the complete confined verifier and both remote heads are rechecked. A push or required receipt-publication failure is fatal.

These pins identify the candidates to verify; they do not assert that queued workflows have passed or authorize merge, deployment, cloud mutation, provider calls, billing actions, secret mutation, receipt publication, or production-data operations.
