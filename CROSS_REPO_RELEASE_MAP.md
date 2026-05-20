# URAI Cross-Repo Release Map

## Purpose

`LifeLoggerAI/urai-staging` owns the Firebase staging backend, validation shell, rules, functions, smoke endpoints, and staging lock evidence.

The product Core Web surface is tracked separately in `LifeLoggerAI/UrAi`.

## Linked Release Gates

| Area | Repository | Tracker |
|---|---|---|
| Firebase staging backend lock | LifeLoggerAI/urai-staging | https://github.com/LifeLoggerAI/urai-staging/issues/6 |
| Core Web staging smoke and product surface lock | LifeLoggerAI/UrAi | https://github.com/LifeLoggerAI/UrAi/issues/286 |

## Decision Rule

Do not call URAI staging fully locked until both trackers have evidence:

- backend deploy and smoke evidence from `LifeLoggerAI/urai-staging`, and
- Core Web staging smoke/build evidence from `LifeLoggerAI/UrAi`.

## Current State

The backend repo is prepared for credentialed deploy verification. The Core Web repo has a separate issue to coordinate staging smoke against the backend lock.
