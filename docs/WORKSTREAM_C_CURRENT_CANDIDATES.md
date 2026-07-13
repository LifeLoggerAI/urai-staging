# Workstream C current exact candidates

Recorded from the live pull-request heads before this verifier update:

- Admin: `d4907967f0f8a6f08824d5ced020926784c97a15`
- Privacy: `d205b9c98488d7411eb88ebb00c2f13ee79cdfed`
- Jobs: `1d8efd602b5a2dfe671a7b2388f17d0789b88955`

The authoritative machine-readable pins are in `scripts/workstream-c-current-candidates.env`.

Use only these official entrypoints:

- `scripts/run-workstream-c-cloud-shell.sh`
- `scripts/run-workstream-c-manual-verification.sh`
- `scripts/repair-jobs-unused-error-reporting.sh`

The corresponding `*-core.sh` files are implementation details and must not be invoked directly. The official wrappers validate the shared exact candidates, preserve explicit caller overrides for confined pre-push verification, and invoke the audited cores.

The manual verifier defaults to zero GitHub publication. Any summary publication requires explicit `WORKSTREAM_C_PUBLISH_SUMMARY=1`, a fully passing verifier, authenticated GitHub CLI access, and a successful issue write.

The Jobs repair operator must also remain non-mutating unless its separate explicit publish authorization succeeds after the exact local candidate passes the complete confined verifier and both remote heads are rechecked.

This update performs no deployment, cloud mutation, provider call, billing action, secret mutation, repository merge, receipt publication, or production-data operation.
