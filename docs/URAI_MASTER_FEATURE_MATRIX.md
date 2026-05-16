# URAI Master Feature Matrix

Statuses use the exact requested categories:

- COMPLETE AND WIRED
- IMPLEMENTED BUT NOT WIRED
- PARTIAL
- STUB / PLACEHOLDER
- PLANNED BUT NOT IMPLEMENTED
- BROKEN / BLOCKED
- DUPLICATE / CONFLICTING
- DEPRECATED / SHOULD REMOVE

| Feature/System | Status | Priority | Files Involved | Routes/Pages | Firebase Collections | Cloud Functions | APIs | UI Components | Missing Pieces | Required Fixes |
|---|---|---:|---|---|---|---|---|---|---|---|
| Staging Firebase backend foundation | COMPLETE AND WIRED | P0 | `firebase.json`, `firestore.rules`, `firestore.indexes.json`, `functions/src/index.ts` | None | `staging_users`, `staging_events`, `staging_jobs`, `staging_featureFlags` | `healthCheck`, `authenticatedHealthCheck`, `adminHealthCheck`, `recordStagingEvent`, `getFeatureFlag`, `setFeatureFlag`, `createStagingJob`, `getStagingCompletionMatrix` | Firebase callable functions, Firestore | None | Verified `.firebaserc` binding | Create `.firebaserc` only after staging project ID is confirmed |
| Production UI / browser app surface | PLANNED BUT NOT IMPLEMENTED | P0 | None in this repo | None | None | None | None | None | No frontend app exists here | Add UI repo integration or add staging UI app |
| URAI V1 passive life-tracking | PLANNED BUT NOT IMPLEMENTED | P0 | None | None | Not defined | Not defined | Device APIs not wired | None | Capture clients, consent, ingestion, dashboards | Define event taxonomy and ingestion functions |
| Audio transcription | PLANNED BUT NOT IMPLEMENTED | P0 | None | None | Not defined | Not defined | Transcription provider absent | None | Upload path, worker, transcript schema | Add consent-gated upload and provider abstraction |
| People/emotion/habit/task tagging | PLANNED BUT NOT IMPLEMENTED | P0 | None | None | Not defined | Not defined | LLM/NLP provider absent | None | Tag schema, processing queue, validation | Create normalized tags and audit logs |
| Social graph and relationship intelligence | PLANNED BUT NOT IMPLEMENTED | P1 | None | None | Not defined | Not defined | None | None | Relationship schema and UI | Use uncertainty-aware language and user controls |
| Ambient sound and habit analysis | PLANNED BUT NOT IMPLEMENTED | P1 | None | None | Not defined | Not defined | Audio classifier absent | None | Signal pipeline and model policy | Implement local-first/consent-first capture |
| GPS/device activity tracking | PLANNED BUT NOT IMPLEMENTED | P1 | None | None | Not defined | Not defined | Mobile OS location/activity APIs absent | None | Mobile clients and privacy controls | Add permission UX and retention policy |
| Daily/weekly dashboards | PLANNED BUT NOT IMPLEMENTED | P1 | None | None | Not defined | None | None | None | Dashboard UI and aggregation jobs | Add summaries and loading/error/empty states |
| AI narrator | PLANNED BUT NOT IMPLEMENTED | P1 | None | None | Not defined | Not defined | LLM/TTS provider absent | None | Prompt contracts, voice config, safety review | Merge under narrative engine contract |
| Cognitive Mirror | PLANNED BUT NOT IMPLEMENTED | P1 | None | None | Not defined | Not defined | LLM/analytics absent | None | Mirror summary schema and UI | Add explainability and confidence scoring |
| Timeline Playback | PLANNED BUT NOT IMPLEMENTED | P1 | None | None | Not defined | Not defined | None | None | Timeline event model and replay UI | Use unified life event schema |
| Mood Forecast | PLANNED BUT NOT IMPLEMENTED | P1 | None | None | Not defined | Not defined | ML model absent | None | Model, fixtures, validation | Add non-clinical guardrails |
| Recovery Timeline | PLANNED BUT NOT IMPLEMENTED | P1 | None | None | Not defined | Not defined | None | None | Recovery scoring and UI | Add rebound definitions and tests |
| Personality Rings | PLANNED BUT NOT IMPLEMENTED | P2 | None | None | Not defined | Not defined | None | None | Trait schema and visualization | Keep traits editable/non-diagnostic |
| Emotional Biome | PLANNED BUT NOT IMPLEMENTED | P2 | None | None | Not defined | Not defined | None | None | Mood ecology schema and renderer | Reuse mood/timeline contracts |
| Symbolic Life Map | PLANNED BUT NOT IMPLEMENTED | P2 | None | None | Not defined | Not defined | Renderer absent | None | Star/memory node schema | Coordinate with `urai-spatial` |
| Memory Galaxy / constellation views | PLANNED BUT NOT IMPLEMENTED | P2 | None | None | Not defined | Not defined | Renderer absent | None | Galaxy renderer and data contract | Coordinate with `urai-spatial` |
| Ritual systems | PLANNED BUT NOT IMPLEMENTED | P2 | None | None | Not defined | Not defined | None | None | Ritual schema, triggers, exports | Keep optional and user-controlled |
| Shadow Cognition Metrics | PLANNED BUT NOT IMPLEMENTED | P1 | None | None | Not defined | Not defined | Passive signal APIs absent | None | Signal definitions and consent controls | Add transparent explanations |
| Obscura Patterns | PLANNED BUT NOT IMPLEMENTED | P1 | None | None | Not defined | Not defined | Passive signal APIs absent | None | Metrics, thresholds, overlays | Add opt-in controls and tests |
| Mental Load Intelligence System | PLANNED BUT NOT IMPLEMENTED | P1 | None | None | Not defined | Not defined | Analytics absent | None | Unified mental-load schema | Merge Shadow/Obscura/Cognitive Stress |
| AI Therapist Replay Mode | PLANNED BUT NOT IMPLEMENTED | P2 | None | None | Not defined | Not defined | LLM/TTS absent | None | Replay UI, disclaimers, safety policy | Avoid clinical therapy claims |
| Attachment / betrayal / trust systems | PLANNED BUT NOT IMPLEMENTED | P2 | None | None | Not defined | Not defined | None | None | Relationship graph, review UI | Present as patterns, not proof |
| Facial/environment inference | PLANNED BUT NOT IMPLEMENTED | P2 | None | None | Not defined | Not defined | MediaPipe/face-api absent | None | On-device inference and image-free storage | Add explicit biometric consent |
| Accessibility/deaf-community features | PLANNED BUT NOT IMPLEMENTED | P2 | None | None | Not defined | Not defined | Haptics/captioning absent | None | Haptic library and device tests | Avoid emergency-reliability claims |
| Insight Marketplace | PLANNED BUT NOT IMPLEMENTED | P3 | None | None | Not defined | Not defined | Payments absent | None | Catalog, entitlements, billing | Legal/privacy review first |
| Pro tier / monetization | PLANNED BUT NOT IMPLEMENTED | P3 | None | None | Not defined | Not defined | Payments absent | None | Subscription model and webhooks | Add entitlement checks |
| Data marketplace | PLANNED BUT NOT IMPLEMENTED | P3 | None | None | Not defined | Not defined | None | None | Anonymization, licensing, withdrawal flows | Legal review required before build |
| URAI Spatial / AR / VR / WebXR | PLANNED BUT NOT IMPLEMENTED | P3 | None | None | Not defined | Not defined | Spatial runtime absent | None | Runtime and schemas | Implement in/with `urai-spatial` |
| URAI Admin | PLANNED BUT NOT IMPLEMENTED | P2 | None | None | Not defined beyond staging jobs/flags | Admin callables only | None | None | Admin UI not here | Integrate `urai-admin` or add routes |
| URAI Privacy | PLANNED BUT NOT IMPLEMENTED | P0 | None | None | Not defined | Not defined | None | None | Consent and deletion workflows | Must precede sensitive launch |
| URAI Foundation | PLANNED BUT NOT IMPLEMENTED | P3 | None | None | Not defined | None | None | None | Governance workflows | Keep as separate ecosystem module |
| URAI Studio / Motion / Cinema / Music / Visuals | PLANNED BUT NOT IMPLEMENTED | P3 | None | None | Not defined | Not defined | Asset/render APIs absent | None | Creator/render workflows | Coordinate with `urai-studio` |
