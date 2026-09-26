export const FEATURE_STATUSES = [
  'COMPLETE AND WIRED',
  'IMPLEMENTED BUT NOT WIRED',
  'PARTIAL',
  'STUB / PLACEHOLDER',
  'PLANNED BUT NOT IMPLEMENTED',
  'BROKEN / BLOCKED',
  'DUPLICATE / CONFLICTING',
  'DEPRECATED / SHOULD REMOVE',
] as const;

export type FeatureStatus = (typeof FEATURE_STATUSES)[number];
export type Priority = 'P0' | 'P1' | 'P2' | 'P3';
export type FeatureScope = 'staging-owned' | 'sibling-dependency' | 'future-hard-off';

export interface FeatureMatrixItem {
  system: string;
  scope: FeatureScope;
  status: FeatureStatus;
  priority: Priority;
  files: string[];
  routes: string[];
  firebaseCollections: string[];
  cloudFunctions: string[];
  apis: string[];
  uiComponents: string[];
  missingPieces: string[];
  integrationRisks: string[];
  requiredFixes: string[];
  launchGate: boolean;
}

export const FEATURE_MATRIX: FeatureMatrixItem[] = [
  {
    system: 'Staging project and production isolation',
    scope: 'staging-owned',
    status: 'COMPLETE AND WIRED',
    priority: 'P0',
    files: ['.firebaserc', 'firebase.json', 'scripts/check-deploy-readiness-v2.mjs'],
    routes: [],
    firebaseCollections: [],
    cloudFunctions: [],
    apis: ['Firebase project authority'],
    uiComponents: [],
    missingPieces: [],
    integrationRisks: ['Future changes could accidentally reintroduce a production selector'],
    requiredFixes: ['Keep production authority absent and continuously validated'],
    launchGate: true,
  },
  {
    system: 'Source, emulator, and exact-head bootstrap verification',
    scope: 'staging-owned',
    status: 'COMPLETE AND WIRED',
    priority: 'P0',
    files: ['.github/workflows/ci.yml', 'scripts/urai-staging-bootstrap.mjs'],
    routes: [],
    firebaseCollections: ['staging_users', 'staging_events', 'staging_jobs', 'staging_featureFlags'],
    cloudFunctions: [],
    apis: ['Firestore emulator'],
    uiComponents: [],
    missingPieces: [],
    integrationRisks: ['Source green can be mistaken for cloud/runtime certification'],
    requiredFixes: ['Retain explicit sourceBootstrapScore naming and separate runtime certification'],
    launchGate: true,
  },
  {
    system: 'Active cross-repository consumer authority',
    scope: 'staging-owned',
    status: 'PARTIAL',
    priority: 'P0',
    files: ['config/staging-consumers.json', 'scripts/validate-active-consumer-refs.mjs'],
    routes: [],
    firebaseCollections: [],
    cloudFunctions: [],
    apis: ['Git exact refs'],
    uiComponents: [],
    missingPieces: ['Frozen final upstream consumer SHAs and terminal exact-head receipts'],
    integrationRisks: ['Moving upstream heads immediately stale dependent staging proof'],
    requiredFixes: ['Fail closed on live ref drift and repin only final approved heads'],
    launchGate: true,
  },
  {
    system: 'Protected WIF/IAM staging provider authority',
    scope: 'staging-owned',
    status: 'IMPLEMENTED BUT NOT WIRED',
    priority: 'P0',
    files: ['scripts/bootstrap-staging-github-wif.sh', '.github/workflows/staging-deploy.yml'],
    routes: [],
    firebaseCollections: [],
    cloudFunctions: [],
    apis: ['Google Workload Identity Federation', 'Google IAM'],
    uiComponents: [],
    missingPieces: ['Provider-side WIF/IAM readback and protected GitHub environment values'],
    integrationRisks: ['Repository configuration cannot prove provider-side IAM'],
    requiredFixes: ['Complete keyless provider bootstrap, positive identity proof, and negative unauthorized proof'],
    launchGate: true,
  },
  {
    system: 'Protected deployment and public staging runtime',
    scope: 'staging-owned',
    status: 'BROKEN / BLOCKED',
    priority: 'P0',
    files: ['.github/workflows/staging-deploy.yml', 'scripts/urai-staging-lock.sh', 'scripts/smoke-staging.sh'],
    routes: ['/', '/robots.txt', '/api/healthz', '/api/buildinfo'],
    firebaseCollections: [],
    cloudFunctions: ['healthz', 'buildinfo', 'companion', 'waitlist'],
    apis: ['Firebase Hosting', 'Cloud Functions'],
    uiComponents: [],
    missingPieces: ['Current healthy runtime, exact deployed SHA, current live smoke receipt'],
    integrationRisks: ['A stale or drifted deployment can look green from repository-only checks'],
    requiredFixes: ['Diagnose current provider state read-only, deploy the approved exact main, and bind smoke to immutable deployment evidence'],
    launchGate: true,
  },
  {
    system: 'Public staging write abuse controls',
    scope: 'staging-owned',
    status: 'PARTIAL',
    priority: 'P0',
    files: ['functions/src/index.ts', 'functions/src/lib/stagingBoundaries.ts'],
    routes: ['/api/waitlist', '/api/companion'],
    firebaseCollections: ['staging_waitlist'],
    cloudFunctions: ['waitlist', 'companion'],
    apis: ['HTTP Functions'],
    uiComponents: [],
    missingPieces: ['Approved caller/origin policy, request-size/rate controls, cleanup/retention and volume monitoring'],
    integrationRisks: ['Public server-side writes bypass client Firestore rules'],
    requiredFixes: ['Bound callers and volume, retain synthetic-only policy, prove denial and cleanup'],
    launchGate: true,
  },
  {
    system: 'Monitoring, recovery, and rollback certification',
    scope: 'staging-owned',
    status: 'PARTIAL',
    priority: 'P0',
    files: ['URAI_STAGING_DEFINITION_OF_DONE.md', '.github/workflows/staging-deploy.yml'],
    routes: ['/api/healthz'],
    firebaseCollections: [],
    cloudFunctions: ['healthz'],
    apis: ['Firebase/Google Cloud runtime'],
    uiComponents: [],
    missingPieces: ['Active monitoring receipt, failure/recovery proof, distinct revision rollback proof'],
    integrationRisks: ['Deployment success without operational recovery is not terminal staging certification'],
    requiredFixes: ['Record pre-deploy target, prove failure detection/recovery, execute or prove rollback, and re-smoke'],
    launchGate: true,
  },
  {
    system: 'Consumer product visual, accessibility, localization, privacy and performance evidence',
    scope: 'sibling-dependency',
    status: 'PARTIAL',
    priority: 'P0',
    files: ['config/staging-consumers.json'],
    routes: [],
    firebaseCollections: [],
    cloudFunctions: [],
    apis: ['Cross-repository retained receipts'],
    uiComponents: [],
    missingPieces: ['Final exact-head receipts from owning repositories'],
    integrationRisks: ['Duplicating product implementations in urai-staging would create competing authority'],
    requiredFixes: ['Consume exact-head receipts from owning repositories; do not implement product surfaces here'],
    launchGate: false,
  },
  {
    system: 'Device, wearable, IoT and XR provider validation',
    scope: 'future-hard-off',
    status: 'PLANNED BUT NOT IMPLEMENTED',
    priority: 'P2',
    files: [],
    routes: [],
    firebaseCollections: [],
    cloudFunctions: [],
    apis: ['Future EWI/device adapters'],
    uiComponents: [],
    missingPieces: ['Activated device/provider contracts and approved test hardware'],
    integrationRisks: ['Premature activation could widen privacy, cost or physical-world authority'],
    requiredFixes: ['Keep interfaces and test contracts hard-off until separately approved'],
    launchGate: false,
  },
];

export const ROADMAP_PHASES = [
  {
    phase: 1,
    name: 'Authority and isolation',
    files: ['.firebaserc', 'config/staging-consumers.json'],
    outcome: 'One non-production staging authority and current exact consumer refs.',
  },
  {
    phase: 2,
    name: 'Source and emulator verification',
    files: ['.github/workflows/ci.yml', 'functions/test'],
    outcome: 'Deterministic source/bootstrap evidence without implying deployment.',
  },
  {
    phase: 3,
    name: 'Protected provider authority',
    files: ['scripts/bootstrap-staging-github-wif.sh', '.github/workflows/staging-deploy.yml'],
    outcome: 'Keyless least-privilege WIF/IAM authority is provider-proven.',
  },
  {
    phase: 4,
    name: 'Protected deployment and runtime identity',
    files: ['scripts/urai-staging-lock.sh', 'scripts/smoke-staging.sh'],
    outcome: 'Exact merged-main SHA is deployed and publicly read back.',
  },
  {
    phase: 5,
    name: 'Operational certification',
    files: ['URAI_STAGING_DEFINITION_OF_DONE.md'],
    outcome: 'Monitoring, failure recovery and rollback are proven.',
  },
  {
    phase: 6,
    name: 'Cross-system certification',
    files: ['config/staging-consumers.json'],
    outcome: 'Owning repositories supply exact-head visual/accessibility/privacy/localization/performance receipts.',
  },
] as const;

export function getCompletionSummary(items: FeatureMatrixItem[] = FEATURE_MATRIX) {
  const byStatus = FEATURE_STATUSES.reduce<Record<FeatureStatus, number>>((acc, status) => {
    acc[status] = items.filter((item) => item.status === status).length;
    return acc;
  }, {} as Record<FeatureStatus, number>);

  const stagingOwned = items.filter((item) => item.scope === 'staging-owned');
  const siblingDependencies = items.filter((item) => item.scope === 'sibling-dependency');
  const futureHardOff = items.filter((item) => item.scope === 'future-hard-off');
  const launchGateFailures = stagingOwned.filter(
    (item) => item.launchGate && item.status !== 'COMPLETE AND WIRED',
  );

  return {
    totalSystems: items.length,
    stagingOwnedSystems: stagingOwned.length,
    siblingDependencies: siblingDependencies.map((item) => item.system),
    futureHardOff: futureHardOff.map((item) => item.system),
    byStatus,
    launchGateFailures: launchGateFailures.map((item) => item.system),
    confidence: launchGateFailures.length === 0 ? 85 : 42,
  };
}
