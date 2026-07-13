# Workstream C current exact candidates

Recorded from the live pull-request heads before this verifier update:

- Admin: `d4907967f0f8a6f08824d5ced020926784c97a15`
- Privacy: `39e658548a440be2c63462fab5b651c065ff8f53`
- Jobs: `25afdff62c43037c16e44ad1be88aa9058bb729a`

The authoritative machine-readable pins are in `scripts/workstream-c-current-candidates.env`.

Use only these official entrypoints:

- `scripts/run-workstream-c-cloud-shell.sh`
- `scripts/run-workstream-c-manual-verification.sh`
- `scripts/repair-jobs-unused-error-reporting.sh`

The corresponding `*-core.sh` files are implementation details and must not be invoked directly. The official wrappers validate the shared exact candidates, preserve explicit caller overrides for confined pre-push verification, and invoke the audited cores.

The manual verifier defaults to zero GitHub publication. Any summary publication requires explicit `WORKSTREAM_C_PUBLISH_SUMMARY=1`, a fully passing verifier, authenticated GitHub CLI access, and a successful issue write.

The Jobs repair operator defaults to local verification only. Remote publication additionally requires `JOBS_REPAIR_PUBLISH=1` and `JOBS_REPAIR_PUBLISH_CONFIRM=PUBLISH_VERIFIED_JOBS_REPAIR` after the exact local candidate passes the complete confined verifier and both remote heads are rechecked. A push or required receipt-publication failure is fatal.

This update performs no deployment, cloud mutation, provider call, billing action, secret mutation, repository merge, receipt publication, or production-data operation.
