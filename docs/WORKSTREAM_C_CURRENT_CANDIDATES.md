# Workstream C current exact candidates

Recorded from the live pull-request heads before this verifier update:

- Admin: `e33f2febd44df793a7ae7e38056af91fd28e6f9d`
- Privacy: `ce4d1043ebd304b6a6978ba90bc70522509a59cb`
- Jobs: `ce990ea815a37e5f15aaf0afc1c62d68a8c50370`

The authoritative machine-readable pins are in `scripts/workstream-c-current-candidates.env`.

Use only these official entrypoints:

- `scripts/run-workstream-c-cloud-shell.sh`
- `scripts/run-workstream-c-manual-verification.sh`
- `scripts/repair-jobs-unused-error-reporting.sh`

The corresponding `*-core.sh` files are preserved byte-for-byte copies of the previously audited logic. They are implementation details and must not be invoked directly. The official wrappers validate and inject the shared exact candidates before executing the preserved cores.

This update performs no deployment, cloud mutation, provider call, billing action, secret mutation, repository merge, or production-data operation.
