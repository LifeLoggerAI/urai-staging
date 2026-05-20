# URAI Staging Smoke Checklist

Use this checklist after deploying `main` to the Firebase staging project.

## Target

- Project: `urai-staging`
- URL: `https://urai-staging.web.app`

## Static Hosting Checks

- `/` returns HTTP 200 and shows the URAI staging shell.
- `/u/adamclamp` returns HTTP 200 through the hosting fallback.
- `/robots.txt` returns HTTP 200 and disallows crawler indexing.

## API Checks

- `/api/healthz` returns HTTP 200 and reports the staging project.
- `/api/buildinfo` returns HTTP 200 and includes release metadata fields.
- `/api/companion` accepts a synthetic non-empty message and returns HTTP 200.
- `/api/companion` rejects an empty message with HTTP 400.
- `/api/waitlist` accepts a synthetic email and returns HTTP 200.
- `/api/waitlist` rejects an invalid email with HTTP 400.

## Data Checks

- Companion smoke writes only a truncated synthetic preview.
- Waitlist smoke writes only synthetic staging email data.
- No production/private user content is used.

## Evidence

Copy the terminal output from the smoke run into the release notes or preserve it alongside `URAI_STAGING_LOCK.md`.
