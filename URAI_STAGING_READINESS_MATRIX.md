# URAI Staging System-of-Systems Readiness Matrix

Status values: Complete, Partial, Missing, Out of Scope, Unknown.

| System | Represented in code/docs? | Connected to staging? | Deployed by this repo? | Status | Missing work | Exact next fix |
|---|---|---|---|---|---|---|
| URAI Core | Yes | Partial | Partial | Partial | Full product UI is not owned here; this repo owns staging backend and minimal hosting shell. | Keep core UI deploy in its canonical app repo; smoke this repo with `npm run deploy:staging`. |
| URAI Staging | Yes | Yes | Yes after local deploy | Complete after lock script passes | Requires Adam's Firebase login to deploy and smoke live. | Run `npm run deploy:staging`. |
| URAI Spatial | Docs only or external repo | No verified runtime here | No | Out of Scope | Spatial/XR runtime not present in this repo. | Keep flagged off or integrate via separate spatial repo deploy evidence. |
| URAI Privacy | Yes | Partial | Rules deploy here | Partial | Needs live Firestore rules deploy and privacy smoke evidence. | Run `npm run test:e2e` and `npm run deploy:staging`. |
| URAI Admin | Yes | Partial | Functions only | Partial | Admin UI is not present; callable admin functions require custom claims. | Keep admin routes protected and verify custom claims in staging. |
| URAI Studio | External/unknown | Unknown | No | Unknown | No direct runtime present in this repo. | Add integration contract or mark external to staging lock. |
| URAI Foundation | External/unknown | Unknown | No | Unknown | No direct runtime present in this repo. | Add integration contract or mark external to staging lock. |
| URAI Labs LLC | External/unknown | Unknown | No | Unknown | No direct runtime present in this repo. | Add integration contract or mark external to staging lock. |
| URAI Analytics | Env checklist only | Unknown | No | Partial | Analytics provider keys and client/server events are not implemented here. | Add analytics endpoint or keep external and document owner. |
| URAI Content | External/unknown | Unknown | No | Unknown | No direct runtime present in this repo. | Add content integration doc or keep out of scope. |
| URAI Communications | Env checklist only | Unknown | No | Partial | Email/SMS providers are env-documented but not active here. | Implement provider-specific staging smoke only after keys are configured. |
| URAI Investors | External/unknown | Unknown | No | Unknown | No direct runtime present in this repo. | Add investor surface integration contract if needed. |
| URAI Jobs | Yes | Partial | Backend staging jobs | Partial | Marketplace/product UI not present; `createStagingJob` exists for admin queue validation. | Add job runner/UI evidence in owning repo. |
| URAI Marketing | External/unknown | Unknown | No | Unknown | No direct runtime present in this repo. | Add marketing integration contract or keep out of scope. |
| URAI Storytime | External/unknown | Unknown | No | Out of Scope | Story/export pipeline is not present in this backend staging repo. | Keep feature-flagged off until implemented in owning repo. |
| URAI B2B Portal | External/unknown | Unknown | No | Unknown | No direct runtime present in this repo. | Add B2B staging URL/API contract and smoke script when available. |

## Repo-owned readiness boundary

This repository can be called complete only for the Firebase staging backend and validation shell. Full URAI system-of-systems completion requires each external module owner to provide its own deployed URL, API contract, smoke output, monitoring link, and rollback SHA.
