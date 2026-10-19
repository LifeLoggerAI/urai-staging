#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';

function locate(name, from) {
  const require = createRequire(from);
  // A declared npm package can share a Node built-in name (for example string_decoder).
  // Resolve manifest search locations without treating that name as a built-in module.
  for (const lookup of require.resolve.paths('__urai_dependency_manifest_lookup__') ?? []) {
    const candidate = path.join(lookup, name, 'package.json');
    if (fs.existsSync(candidate)) return fs.realpathSync(candidate);
  }
  return null;
}
export function installedGraph(repositoryRoot, importers) {
  repositoryRoot = fs.realpathSync(path.resolve(repositoryRoot));
  const nodes = new Map();
  const problems = [];
  for (const importer of importers) {
    const manifestPath = path.resolve(repositoryRoot, importer, 'package.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath));
    const queue = [];
    function add(name, from, sourcePath, optional) {
      const packagePath = locate(name, from);
      if (!packagePath || !packagePath.startsWith(repositoryRoot + path.sep)) {
        if (!optional) problems.push({name, from, sourcePath, problem: 'Required installed package missing or outside checkout'});
        return;
      }
      queue.push({packagePath, sourcePath});
    }
    for (const kind of ['dependencies', 'devDependencies', 'optionalDependencies']) {
      for (const name of Object.keys(manifest[kind] ?? {})) add(name, manifestPath, [`${importer} [${kind}]`, name], kind === 'optionalDependencies');
    }
    const visited = new Set();
    for (let index = 0; index < queue.length; index++) {
      const {packagePath, sourcePath} = queue[index];
      if (visited.has(packagePath)) continue;
      visited.add(packagePath);
      const manifest = JSON.parse(fs.readFileSync(packagePath));
      const node = nodes.get(packagePath) ?? {name: manifest.name, version: manifest.version, packagePath: path.relative(repositoryRoot, packagePath), sourcePaths: []};
      node.sourcePaths.push(sourcePath);
      nodes.set(packagePath, node);
      for (const kind of ['dependencies', 'optionalDependencies', 'peerDependencies']) {
        for (const name of Object.keys(manifest[kind] ?? {})) {
          const optional = kind === 'optionalDependencies' || manifest.peerDependenciesMeta?.[name]?.optional === true;
          add(name, packagePath, [...sourcePath, `${manifest.name}@${manifest.version}`, name], optional);
        }
      }
    }
  }
  return {nodes: [...nodes.values()], problems};
}
export function affected(version, entry, semver) {
  const normalize = value => {
    if (semver.valid(value)) return value;
    if (/^\d+(?:\.\d+){0,2}$/.test(value)) return value + '.0'.repeat(3 - value.split('.').length);
    throw new Error(`Unsupported official advisory boundary: ${value}`);
  };
  if (entry.versions?.includes(version)) return true;
  for (const range of entry.ranges ?? []) {
    if (!['SEMVER', 'ECOSYSTEM'].includes(range.type)) throw new Error(`Unsupported npm advisory range type: ${range.type}`);
    let start;
    for (const event of range.events) {
      if (event.introduced !== undefined) start = event.introduced;
      else if (start !== undefined) {
        const end = event.fixed ?? event.last_affected ?? event.limit;
        if (end === undefined) throw new Error('Unrecognized advisory range end');
        if ((start === '0' || semver.gte(version, normalize(start))) && (event.last_affected ? semver.lte(version, normalize(end)) : semver.lt(version, normalize(end)))) return true;
        start = undefined;
      }
    }
    if (start !== undefined && (start === '0' || semver.gte(version, normalize(start)))) return true;
  }
  return false;
}
export function match(graph, advisories, semver) {
  const byName = new Map();
  for (const advisory of advisories) {
    if (advisory.withdrawn) continue;
    for (const entry of advisory.affected ?? []) {
      if (entry.package?.ecosystem !== 'npm') continue;
      const entries = byName.get(entry.package.name) ?? [];
      entries.push({advisory, entry});
      byName.set(entry.package.name, entries);
    }
  }
  const findings = [];
  for (const node of graph.nodes) {
    if (!semver.valid(node.version)) throw new Error(`Invalid installed version: ${node.name}@${node.version}`);
    for (const {advisory, entry} of byName.get(node.name) ?? []) {
      if (!affected(node.version, entry, semver)) continue;
      const severity = advisory.database_specific?.severity?.toLowerCase();
      if (!['low', 'moderate', 'high', 'critical'].includes(severity)) throw new Error(`Missing official severity: ${advisory.id}`);
      findings.push({...node, advisory: advisory.id, severity, primaryUrl: `https://github.com/advisories/${advisory.id}`});
    }
  }
  const severeUniqueAdvisories = [...new Set(findings.filter(f => ['high', 'critical'].includes(f.severity)).map(f => f.advisory))].sort();
  return {status: graph.problems.length || severeUniqueAdvisories.length ? 'BLOCKED' : 'PASS_WITHIN_RETAINED_REVIEWED_SNAPSHOT', severeUniqueAdvisories, installedNodes: graph.nodes.length, problems: graph.problems, findings};
}
