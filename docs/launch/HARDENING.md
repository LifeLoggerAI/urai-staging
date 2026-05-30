# URAI Staging Hardening

Domain: uraistaging.com

Before approval:

- Root and login show only a private preview gate.
- Global metadata is noindex, nofollow, and noarchive.
- Previews, QA, and client-preview routes are gated.
- No private data renders before access checks complete.
- Staging data is separated from production data.
- Mock or sanitized data is preferred.
- Staging label is visible after login.
- Private interiors do not show a public ecosystem footer.
- No secrets exist in the client bundle.
- Build, typecheck, tests, and QA are recorded.
- DNS, SSL, deploy URL, latest commit, and owner approval are recorded.
