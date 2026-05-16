# URAI Known Limitations

## Repository scope

`LifeLoggerAI/urai-staging` is currently a staging backend validation repository. It does not contain the full URAI product UI or all ecosystem modules.

## Verification limitations from this implementation pass

- The execution sandbox could not resolve `github.com`, so the repository could not be cloned locally.
- Dependencies could not be installed from the network.
- TypeScript/build/test commands could not be run in the sandbox.
- Changes were made through the GitHub connector and must be verified in a developer environment or CI.

## Product limitations

- No frontend routes/pages/components exist in this repo.
- No browser/mobile E2E tests exist because no UI exists in this repo.
- No audio capture/transcription flow exists.
- No AI narrator or LLM pipeline exists.
- No TTS voice pipeline exists.
- No passive device/GPS/activity capture exists.
- No relationship/social graph engine exists.
- No mental-health inference engine exists.
- No facial/biometric inference exists.
- No AR/VR/WebXR runtime exists.
- No marketplace/payment/data-sale flows exist.
- No user-facing consent/deletion/privacy dashboard exists here.

## Deployment limitations

- `.firebaserc` is intentionally absent until the real staging Firebase project ID is confirmed.
- `functions/package-lock.json` must be generated and committed after first verified install.
- Provider credentials/API keys are not present and should not be committed.

## Safety and compliance limitations

The following feature families require privacy, safety, legal, and product review before launch:

- Audio recording/transcription.
- Facial or biometric inference.
- Mental-health or crisis-related inference.
- Relationship deception/betrayal/trust scoring.
- Data marketplace or user data monetization.
- Accessibility/safety alerts for deaf-community support.

## Confidence impact

These limitations cap full production-readiness confidence at 42/100 until staging is connected to a verified UI, the Firebase project is bound, tests pass, and sensitive feature policies are implemented.
