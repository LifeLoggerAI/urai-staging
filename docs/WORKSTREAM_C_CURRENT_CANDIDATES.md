# Workstream C current exact candidates

Recorded from the live pull-request heads before this verifier update:

- Admin: `e33f2febd44df793a7ae7e38056af91fd28e6f9d`
- Privacy: `371e9a8db9b24a0cbdd3a6753776be6920ce736c`
- Jobs: `ed7f80517e4fa940472a93f22e9d42e080ddeb6c`

The authoritative machine-readable pins are in `scripts/workstream-c-current-candidates.env`.

Use only these official entrypoints:

- `scripts/run-workstream-c-cloud-shell.sh`
- `scripts/run-workstream-c-manual-verification.sh`
- `scripts/repair-jobs-unused-error-reporting.sh`

The corresponding `*-core.sh` files are preserved byte-for-byte copies of the previously audited logic. They are implementation details and must not be invoked directly. The official wrappers validate and inject the shared exact candidates before executing the preserved cores.

This update performs no deployment, cloud mutation, provider call, billing action, secret mutation, repository merge, or production-data operation.
