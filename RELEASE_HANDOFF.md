# URAI Staging Release Handoff

## Current State

- Repository: LifeLoggerAI/urai-staging
- Firebase project: urai-staging
- Hosting site: urai-staging
- Staging URL: https://urai-staging.web.app
- Scope: Firebase staging backend, validation shell, rules, functions, documentation, and release evidence.

## Completed

- URAI staging shell added with orb, ground layer, companion smoke framing, and endpoint links.
- Staging project references normalized to urai-staging.
- Release documentation added.
- CI workflow hardened with Node, Java, dependency install, readiness check, build, unit, and emulator rules coverage.
- Staging lock evidence template added.

## Still Required for Live Lock

- Run dependency install.
- Run deploy readiness check.
- Run typecheck and build.
- Run unit tests.
- Run emulator-backed rules tests.
- Deploy to the staging Firebase project.
- Run live smoke tests.
- Commit the generated staging lock evidence file.

## Decision

This repo is ready for credentialed staging verification, but it is not live-locked until deploy and smoke evidence is generated from an authenticated Firebase environment.
