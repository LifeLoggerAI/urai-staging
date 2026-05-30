# Wave 5 URAI Staging Launch Lock Evidence

Domain: uraistaging.com

Repo: LifeLoggerAI/urai-staging

Status: implementation evidence in progress

## Required role

URAI Staging is the private preview, QA, client-preview, and pre-production verification environment for URAI sites, apps, portals, assets, and launch surfaces.

## Required public surface

URAI Staging must not behave like a marketing site.

Before authentication or password/token access, only a minimal private preview boundary should render:

- `/`
- `/login`

Approved pre-auth copy:

- `URAI Staging`
- `Private preview environment.`

## Required protected routes

- `/previews`
- `/qa`
- `/client-preview/[id]`
- any draft launch surface
- any unreleased campaign
- any client preview
- any staging-only build

## Required private boundary

The site must not expose:

- production user data
- private client data
- unreleased assets
- internal QA notes
- draft claims
- unpublished launch pages
- debug panels
- environment secrets
- staging credentials
- production analytics or admin data

## Required access behavior

- Global noindex/nofollow/noarchive metadata
- Password, auth, or token gate before private previews
- No private data flash before access checks complete
- Denied-access state
- Clear staging label after login
- Staging data separated from production
- Prefer mock or sanitized data
- No public ecosystem footer inside private preview interiors
- No secrets in client bundle

## Required shared foundation

- Shared portal/private shell or equivalent
- Metadata/no-index pattern
- Denied-access/loading states
- Staging status banner
- QA script for no-index, placeholder/debug text, and protected route checks

## Evidence still required before approval

- Confirm root/login show only private preview gate
- Confirm global noindex/nofollow/noarchive
- Confirm preview/QA/client-preview routes are gated
- Confirm no private data renders before access checks
- Confirm staging/production data separation
- Confirm no secrets exist in client bundle
- Confirm staging label after login
- Run build/typecheck/QA
- Confirm DNS and SSL for `uraistaging.com`
- Record production deployment URL
- Record latest deploy commit
- Record owner approval

## Current launch decision

Do not mark approved until access, no-index, private-data, staging separation, secret, DNS/SSL, build, and QA evidence are recorded.
