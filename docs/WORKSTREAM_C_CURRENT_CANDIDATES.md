# Workstream C current exact candidates

Recorded from the live pull-request heads before this verifier update:

- Admin: `4ced175052de80784a09109dbc9cfaede718748a`
- Privacy: `ce4d1043ebd304b6a6978ba90bc70522509a59cb`
- Jobs: `74fc56329bf78c6d0b9c14cfb28de9dd5aa9bf51`

The authoritative machine-readable pins are in `scripts/workstream-c-current-candidates.env`.

Use only these official entrypoints:

- `scripts/run-workstream-c-cloud-shell.sh`
- `scripts/run-workstream-c-manual-verification.sh`
- `scripts/repair-jobs-unused-error-reporting.sh`

The corresponding `*-core.sh` files are preserved byte-for-byte copies of the previously audited logic. They are implementation details and must not be invoked directly. The official wrappers validate and inject the shared exact candidates before executing the preserved cores.

This update performs no deployment, cloud mutation, provider call, billing action, secret mutation, repository merge, or production-data operation.
