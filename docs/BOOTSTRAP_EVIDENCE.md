# URAI Staging Bootstrap Evidence

The staging repo now has a self-contained bootstrap runner:

```bash
node scripts/urai-staging-bootstrap.mjs
```

The runner removes `NPM_CONFIG_PREFIX` for child commands, validates that it is running from `LifeLoggerAI/urai-staging`, installs root and Functions dependencies, runs readiness checks, and writes an evidence report to:

```text
artifacts/launch/staging-bootstrap-report.json
```

The evidence report includes:

- repository name
- bootstrap type
- start time
- finish time
- final status
- skipped checks
- every command that ran
- command start and finish timestamps
- exit code for each command
- exact failure point when a command fails

Use `URAI_SKIP_RULES=1` only when Firebase emulator dependencies are unavailable and you want to run the non-rules portion of staging validation.
