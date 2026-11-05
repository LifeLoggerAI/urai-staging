#!/usr/bin/env bash
# R744 One UrAi: immutable synthetic-only owner acceptance; never deploy.
set -Eeuo pipefail
URL='https://github.com/LifeLoggerAI/urai-staging.git'
SHA='9bbc20983542256a0d78972455d0bec2c36b4b0d'
TREE='a55ac4a5986b8001aaf9adcdd8dbfb3533c0efb5'
RUN_DIR="$(mktemp -d /tmp/one-urai-r744.XXXXXX)"
SRC="$RUN_DIR/source"; OUT="$RUN_DIR/evidence"; mkdir -p "$OUT" "$RUN_DIR/home"
printf 'schema=one-urai.r744.owner-acceptance.v1\nsha=%s\ntree=%s\nproductionAuthorized=false\n' "$SHA" "$TREE" > "$OUT/RESULTS.txt"
failed=0
finish() { local rc=$?; (cd "$OUT" && sha256sum -- *.log RESULTS.txt > SHA256SUMS.txt 2>/dev/null || true); printf '\n[R744] exit=%s; evidence=%s; RELEASE HOLD\n' "$rc" "$OUT"; }
trap finish EXIT
record() {
  local name="$1"; shift; local rc=0
  "$@" >"$OUT/$name.log" 2>&1 || rc=$?
  printf '%s exit=%s\n' "$name" "$rc" >>"$OUT/RESULTS.txt"
  printf '[R744] %s exit=%s\n' "$name" "$rc"
  tail -n 5 "$OUT/$name.log" || true
  return "$rc"
}
for c in git node npm java sha256sum; do command -v "$c" >/dev/null || { echo "Missing $c" >&2; exit 2; }; done
[[ "$(node --version)" == v22.* ]] || { echo 'Node 22 required' >&2; exit 2; }
java -version >"$OUT/java-version.log" 2>&1 || exit 2
record git-init git init -q "$SRC"
record git-remote git -C "$SRC" remote add origin "$URL"
record git-fetch git -C "$SRC" fetch --no-tags --depth=1 origin refs/pull/134/head
[[ "$(git -C "$SRC" rev-parse FETCH_HEAD)" == "$SHA" ]] || { echo 'PR head moved: stop' >&2; exit 3; }
record git-checkout git -C "$SRC" -c core.autocrlf=false checkout -q --detach "$SHA"
assert_source() {
  [[ "$(git -C "$SRC" rev-parse HEAD)" == "$SHA" ]] &&
  [[ "$(git -C "$SRC" rev-parse 'HEAD^{tree}')" == "$TREE" ]] &&
  [[ "$(git -C "$SRC" ls-files | wc -l | tr -d ' ')" == 239 ]] &&
  [[ -z "$(git -C "$SRC" status --porcelain --untracked-files=no)" ]]
}
assert_source || { echo 'Exact Git source/tree failed' >&2; exit 3; }
cd "$SRC"
unset FIREBASE_TOKEN GOOGLE_APPLICATION_CREDENTIALS GOOGLE_CLOUD_PROJECT GCLOUD_PROJECT FIREBASE_CONFIG GITHUB_TOKEN GH_TOKEN NPM_TOKEN URAI_CROSS_REPO_READ_TOKEN || true
export HOME="$RUN_DIR/home" NPM_CONFIG_USERCONFIG=/dev/null CI=true NO_GCE_CHECK=true FIREBASE_CLI_DISABLE_UPDATE_CHECK=true
export URAI_EMULATOR_PROJECT=urai-staging-test TARGET_SHA="$SHA" URAI_R451_RECEIPT="$OUT/r451-combined.json"
export FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
export FIREBASE_STORAGE_EMULATOR_HOST=127.0.0.1:9199 FIREBASE_FUNCTIONS_EMULATOR_HOST=127.0.0.1:5001
expect_denial() {
  local label="$1" marker="$2"
  shift 2
  local rc=0
  record "$label" "$@" || rc=$?
  if [[ "$rc" -ne 1 ]] || ! grep -Fq -- "$marker" "$OUT/$label.log"; then
    echo "Unsafe or unverified denial: $label, exit=$rc. Read $OUT/$label.log" >&2
    return 1
  fi
  printf '[R744] verified expected denial: %s\n' "$label"
}
record frozen-functions-install npm --prefix functions ci --ignore-scripts --engine-strict --no-audit --no-fund || exit 4
record original-root-check npm run check || failed=1
FIREBASE="$SRC/functions/node_modules/.bin/firebase"
[[ -x "$FIREBASE" ]] || { echo 'Frozen Firebase CLI missing' >&2; exit 4; }
[[ ! -e "$URAI_R451_RECEIPT" ]] || { echo 'Receipt exists; possible replay' >&2; exit 4; }
record r451-four-emulators "$FIREBASE" emulators:exec --project urai-staging-test --config firebase.json --only auth,firestore,storage,functions 'node scripts/r451-combined-emulator-acceptance.mjs' || failed=1
if [[ -f "$URAI_R451_RECEIPT" ]]; then
  record r451-receipt node --input-type=module -e '
    import assert from "node:assert/strict";
    import {readFileSync,lstatSync} from "node:fs";
    const p=process.env.URAI_R451_RECEIPT,s=lstatSync(p),r=JSON.parse(readFileSync(p,"utf8"));
    assert.ok(s.isFile()&&!s.isSymbolicLink()&&s.nlink===1);
    assert.equal(r.schemaVersion,"urai-r451-four-emulator-combined-1");
    assert.equal(r.exactStagingSource,process.env.TARGET_SHA);
    assert.equal(r.projectId,"urai-staging-test");
    assert.equal(r.checksPassed,58);
    assert.deepEqual(r.suites.map(x=>x.passed),[18,40]);
    assert.deepEqual(r.actualEmulatorServices,["Authentication","Firestore","Storage","Functions"]);
    for(const k of ["cryptographicallyVerifiedCloudIAM","actualJobsWorkerAndPrivacyCallableIntegrated","actualStudioAndReplayIntegrated","positiveRenderConsentGranted","realPrivateMovieGenerationVerified","productionAccessOrSpending","finalReleaseAccepted"])assert.equal(r[k],false);
    console.log("R451_SYNTHETIC_PASS_RELEASE_HOLD");' || failed=1
else failed=1; fi
record r439-auth "$FIREBASE" emulators:exec --project urai-staging-test --config firebase.json --only auth 'node functions/test/r439-original-jobs-privacy-auth.emulator.mjs' || failed=1
record firestore-storage-rules "$FIREBASE" emulators:exec --project urai-staging-test --config firebase.json --only firestore,storage 'cd functions && ./node_modules/.bin/vitest run test/firestore.rules.test.ts test/storage.rules.test.ts' || failed=1
expect_denial release-admission-denial '[GENESIS STAGING] BLOCKED: Privacy-to-Jobs staged consumer ownership is not accepted.' node scripts/validate-privacy-jobs-staging-admission.mjs || failed=1
expect_denial protected-approval-denial '[GENESIS STAGING] HOLD: Protected GitHub read-only token is required; no source approval attested' node scripts/verify-privacy-jobs-protected-approval.mjs || failed=1
assert_source || { echo 'Source changed after tests' >&2; exit 5; }
[[ "$failed" == 0 ]] || exit 1
echo 'Local original tests scoped PASS; hosted CI, real cross-service deletion, review and founder GO remain unverified.'
