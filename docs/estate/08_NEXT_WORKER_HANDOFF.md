# 08 — Next worker: exact safe execution commands
**Pinned source:** advanced draft #176 R840 `49d705f21a0d8370f9c6b9db5cf344b1b20a1d9b`; main `bda659ad23590b39e7f32de349f8a3723455ce02`. **HOLD**. Run original tests only on an authorized non-paid clean machine with network to GitHub/npm, Node 22, Java 21; do **not** use cloud Firebase credentials, customer data or real GCP project for emulator acceptance.
```bash
git clone https://github.com/LifeLoggerAI/urai-staging.git
cd urai-staging
git fetch origin 49d705f21a0d8370f9c6b9db5cf344b1b20a1d9b
git checkout --detach 49d705f21a0d8370f9c6b9db5cf344b1b20a1d9b
test "$(git rev-parse HEAD)" = "49d705f21a0d8370f9c6b9db5cf344b1b20a1d9b"
test -z "$(git status --porcelain --untracked-files=all)"
node --version
java -version
npm --prefix functions ci --ignore-scripts --engine-strict --audit=false
npm run check:lockfile
npm run test:r816:capacity
npm run check
npm run check:deploy
test -z "${GOOGLE_APPLICATION_CREDENTIALS:-}"
test -z "${FIREBASE_TOKEN:-}"
npm --prefix functions run test:synthetic-lifecycle:http-emulator
```
The last script is expressly `urai-staging-test` three local Auth/Firestore/Storage emulators, with 23 unique real callable HTTP checks; four-emulator Functions integration is a separate gate. Save command, exact SHA/tree, pristine status, dependencies, exit code, full logs and artifact SHA256. If the head changes, all affected tests must rerun.
**Do not execute** `npm run deploy:staging`, `firebase deploy`, protected GitHub workflow live mode, Twilio/SendGrid sends, cloud mutations, billing changes, production/developer user memory access, or production deploy without specific separate authorization.
Next: admin account Actions admission/billing check (existing Support #4889576), current exact-head genuine steps, branch rulesets/independent reviewer, 23/23 and separate 4-emulator, clean source build, read-only GCP/Firebase project IAM/site/deployed SHA/Rules, current outside-in smoke, actual Consent issuer→Jobs→Studio→protected Replay, monitoring/recovery/rollback, device test, separately governed public launch.
This audit container could not resolve GitHub/npm DNS for a native clone; recent failed workflow job logs 404; no native build, emulator, current cloud smoke, production or physical device test was executed.
