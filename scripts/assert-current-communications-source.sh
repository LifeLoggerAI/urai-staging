#!/usr/bin/env bash
set -euo pipefail

# Profiles are source-controlled; arbitrary repository/branch/SHA inputs are denied.
node --input-type=module <<'NODE'
import assert from 'node:assert/strict';
import { sourceProfile } from './scripts/verify-staging-verification-binding.mjs';
const source = sourceProfile(process.env.COMMUNICATIONS_SOURCE_PROFILE);
assert.equal(process.env.COMMUNICATIONS_REPOSITORY, source.repository);
assert.equal(process.env.COMMUNICATIONS_BRANCH, source.branch);
assert.equal(process.env.COMMUNICATIONS_SHA, source.sha);
NODE

if [ -n "${CROSS_REPO_READ_TOKEN:-}" ]; then
  live_sha="$(curl --connect-timeout 10 --max-time 30 --silent --show-error --fail \
    -H "Authorization: Bearer $CROSS_REPO_READ_TOKEN" \
    -H 'Accept: application/vnd.github+json' \
    -H 'X-GitHub-Api-Version: 2022-11-28' \
    "https://api.github.com/repos/LifeLoggerAI/urai-communications/git/ref/heads/$COMMUNICATIONS_BRANCH" \
    | node -e "let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>process.stdout.write(JSON.parse(s).object.sha))")"
  echo 'CROSS_REPO_AUTH_MODE=token' >> "$GITHUB_ENV"
elif [ -n "${CROSS_REPO_READ_SSH_KEY:-}" ]; then
  umask 077
  key_file="$RUNNER_TEMP/urai-cross-repo-read"
  known_hosts="$RUNNER_TEMP/urai-github-known-hosts"
  printf '%s\n' "$CROSS_REPO_READ_SSH_KEY" > "$key_file"
  ssh-keyscan -T 10 -t ed25519 github.com > "$known_hosts" 2>/dev/null
  live_sha="$(GIT_SSH_COMMAND="ssh -i $key_file -o IdentitiesOnly=yes -o UserKnownHostsFile=$known_hosts -o StrictHostKeyChecking=yes" \
    timeout --kill-after=5s 30s git ls-remote git@github.com:LifeLoggerAI/urai-communications.git "refs/heads/$COMMUNICATIONS_BRANCH" \
    | awk 'NR==1 {print $1}')"
  echo 'CROSS_REPO_AUTH_MODE=ssh' >> "$GITHUB_ENV"
else
  echo 'Missing protected Communications read token and read-only deploy key.' >&2
  exit 41
fi
test "$live_sha" = "$COMMUNICATIONS_SHA" || { echo 'Selected Communications source ref moved or is inaccessible.' >&2; exit 42; }
echo 'COMMUNICATIONS_SOURCE_REF_VERIFIED=true' >> "$GITHUB_ENV"
