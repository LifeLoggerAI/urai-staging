#!/usr/bin/env node
// Exercises the actual staging assembler public/ directory; never dev source.
import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { pathToFileURL } from 'node:url'

const root = path.resolve(process.env.URAI_NATIVE_OUTPUT || '')
const playwrightRoot = process.env.URAI_PLAYWRIGHT_ROOT
const base = process.env.URAI_NATIVE_BASE_URL || 'http://127.0.0.1:4173'
const evidence = path.resolve(process.env.URAI_BROWSER_EVIDENCE || 'artifacts/native-consumer-browser')
const expected = '279735522dda1008c74b9c303fb15fe9b497d3cfe081e5a1013f1f1e32eccde2'
if (!root || !playwrightRoot || !fs.existsSync(path.join(root, 'public'))) throw new Error('Real native assembler output / Playwright runtime unavailable')
const original = fs.readFileSync(path.join(root, 'consumer-artifact-manifest.json'))
if (createHash('sha256').update(original).digest('hex') !== expected) throw new Error('Native package manifest has not passed source-identity proof')
const manifest = JSON.parse(original.toString('utf8'))
if (manifest.sourceSha !== '5eb2320fdd52c1e18a9c568b2168e0e03797fa33' || manifest.fileCount !== 1522 || manifest.servedFileCount !== 1521 || manifest.restrictedStaticPrefixes?.join(',') !== '/xr/,/spatial/ar-vr/' || manifest.deployed !== false) throw new Error('Unsafe native package authority or XR staging exposure')
fs.mkdirSync(evidence, { recursive: true })
const { chromium } = await import(pathToFileURL(path.join(playwrightRoot, 'node_modules/playwright/index.mjs')).href)
const results = { schemaVersion: 'urai-native-package-browser-evidence-1', sourceSha: manifest.sourceSha,
  nativeManifestSha256: expected, servedDirectory: 'native-assembled-public',
  scope: 'isolated-compiled-static-frontend-no-authenticated-provider-or-production-claim',
  pages: [], interactions: [], pageErrors: [], consoleErrors: [], failedRequests: [], badNetwork: [], javascriptRequests: 0, screenshots: [], failures: [],
  authenticatedBackendVerified: false, lifeMoviesVerified: false, finalArtAccepted: false, deployed: false }
const safePath = url => { try { const u = new URL(url); return u.origin === base ? u.pathname : 'external:' + u.hostname } catch { return 'malformed-url' } }
const appRoutes = ['/home/', '/ascent/', '/life-map/', '/focus/', '/replay/', '/unwind/', '/login/', '/privacy-controls/']
let browser
try {
  browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader', '--disable-gpu-sandbox', '--disable-dev-shm-usage'] })
  async function scenario(label, viewport, reducedMotion = false, noWebGL = false) {
    const context = await browser.newContext({ viewport, reducedMotion: reducedMotion ? 'reduce' : 'no-preference' })
    const page = await context.newPage()
    if (noWebGL) await page.addInitScript(() => {
      const originalGetContext = HTMLCanvasElement.prototype.getContext
      HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
        if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') return null
        return originalGetContext.call(this, type, ...rest)
      }
    })
    page.on('pageerror', error => results.pageErrors.push({ scenario: label, message: String(error).slice(0, 450) }))
    page.on('console', event => { if (event.type() === 'error') results.consoleErrors.push({ scenario: label, text: event.text().slice(0, 450) }) })
    page.on('requestfailed', request => results.failedRequests.push({ scenario: label, path: safePath(request.url()), failure: request.failure() }))
    page.on('response', response => {
      if (response.url().includes('/_next/static/') && /\.js(?:\?|$)/.test(response.url()) && response.ok()) results.javascriptRequests++
      if (new URL(response.url()).origin === base && response.status() >= 400) results.badNetwork.push({ scenario: label, status: response.status(), path: safePath(response.url()) })
    })
    const routes = label === 'desktop' ? appRoutes : ['/home/', '/life-map/', '/focus/', '/replay/']
    for (const route of routes) {
      let response
      try {
        response = await page.goto(base + route, { waitUntil: 'domcontentloaded', timeout: 35000 })
        await page.waitForTimeout(2100)
        const title = await page.title()
        const body = (await page.locator('body').innerText({ timeout: 10000 })).slice(0, 220)
        const h1 = await page.locator('h1').allTextContents()
        const canvas = await page.locator('canvas').count()
        const scripts = await page.locator('script[src*="_next/static/"]').count()
        const status = response?.status() ?? null
        results.pages.push({ scenario: label, route, status, title: title.slice(0, 120), h1: h1.slice(0, 2), canvas, scriptElements: scripts, bodyLength: body.length })
        if (status !== 200 || scripts < 1 || body.length < 10) results.failures.push(label + ' compiled route not usable: ' + route)
        if (['/home/', '/life-map/', '/focus/', '/replay/'].includes(route)) {
          const screenshot = label + '-' + route.replace(/[^a-z0-9]/gi, '-') + '.png'
          await page.screenshot({ path: path.join(evidence, screenshot), timeout: 20000 })
          results.screenshots.push(screenshot)
        }
        if (route === '/home/' && label === 'desktop') {
          // Exercise actual browser focus/keyboard semantics, without forging a memory.
          await page.keyboard.press('Tab')
          results.interactions.push({ scenario: label, operation: 'keyboard-tab-home', focused: await page.evaluate(() => document.activeElement?.tagName || null) })
          const links = await page.locator('a[href]').evaluateAll(nodes => nodes.slice(0, 45).map(a => a.getAttribute('href')))
          results.interactions.push({ scenario: label, operation: 'real-home-anchor-inventory', links: links.slice(0, 35) })
        }
      } catch (error) {
        results.failures.push(label + ' ' + route + ' ' + String(error).slice(0, 290))
      }
    }
    await context.close()
  }
  await scenario('desktop', { width: 1440, height: 900 })
  await scenario('mobile-reduced-motion', { width: 390, height: 844 }, true)
  await scenario('no-webgl', { width: 1024, height: 768 }, true, true)
  // A passing route load is not proof of the actual memory journey. Exercise
  // Focus -> Replay -> Escape in the same isolated native package, including
  // reduced motion, and measure return events across possible hard navigations.
  async function verifyReplayReturn(label, viewport, reduce = false) {
    const context = await browser.newContext({ viewport, reducedMotion: reduce ? 'reduce' : 'no-preference' })
    const page = await context.newPage()
    let returns = 0
    try {
      page.on('pageerror', error => results.pageErrors.push({ scenario: label, message: String(error).slice(0, 450) }))
      await page.exposeFunction('__uraiCountReturn', () => { returns++ })
      await page.goto(base + '/focus/?memoryId=demo%3Aseed-memory-bloom&demo=1', { waitUntil: 'domcontentloaded', timeout: 35000 })
      await page.getByTestId('urai-final-focus-chamber').first().waitFor({ state: 'visible', timeout: 35000 })
      const entry = page.getByRole('button', { name: /Open Replay for|Replay this memory/i }).first()
      await entry.waitFor({ state: 'visible', timeout: 35000 })
      await entry.click()
      await page.waitForURL(/\/replay\/?\?/, { timeout: 35000 })
      const replay = page.getByTestId('cinematic-replay-client').first()
      await replay.waitFor({ state: 'visible', timeout: 35000 })
      await page.locator('main.replayWorld[data-replay-media-ready="true"]').first().waitFor({ state: 'attached', timeout: 60000 })
      await page.evaluate(() => window.addEventListener('urai:world-return', () => { void window.__uraiCountReturn() }))
      await page.keyboard.press('Escape')
      await page.waitForURL(/\/(focus|unwind)(\/|\?|$)/, { timeout: 35000 })
      await replay.waitFor({ state: 'detached', timeout: 35000 })
      const final = new URL(page.url()).pathname
      const destinationVisible = final.replace(/\/$/, '') === '/focus'
        ? await page.getByTestId('urai-final-focus-chamber').first().isVisible()
        : await page.locator('main').first().isVisible()
      const focused = await page.evaluate(() => ({
        tag: document.activeElement?.tagName || null,
        name: document.activeElement?.getAttribute?.('aria-label') || null
      }))
      results.interactions.push({
        scenario: label, operation: 'actual-focus-replay-escape-return',
        destination: final, returnEventCount: returns,
        replayUnmounted: await replay.count() === 0,
        destinationVisible, focused
      })
      if (returns !== 1 || !destinationVisible) {
        results.failures.push(label + ' Replay Escape did not perform one complete return with mounted destination')
      }
    } catch (error) {
      results.failures.push(label + ' actual Focus-Replay-Escape flow: ' + String(error).slice(0, 350))
    } finally { await context.close() }
  }
  await verifyReplayReturn('desktop-escape', { width: 1440, height: 900 })
  await verifyReplayReturn('mobile-reduced-motion-escape', { width: 390, height: 844 }, true)
  // Direct and encoded requests must not reveal a disabled XR page, navmesh,
  // or a directory index, even on a generic static Hosting server.
  for (const route of ['/xr', '/xr/', '/xr/navmeshes/home-platform-v1.json',
    '/xr/%6eavmeshes/home-platform-v1.json', '/xr%2Fnavmeshes%2Fhome-platform-v1.json',
    '/spatial/ar-vr', '/spatial/ar-vr/']) {
    const response = await fetch(base + route, { redirect: 'manual' })
    results.interactions.push({ operation: 'denied-static-xr-route', route, status: response.status })
    if (response.status !== 404) results.failures.push('Protected static XR route exposed: ' + route + ' HTTP ' + response.status)
  }
  // Non-private XR illustration and clearly disclosed static signaling status
  // remain available; they are not permission to activate an XR experience.
  for (const route of ['/assets/urai/xr/ar/unsupported-fallback.webp', '/api/xr/signaling']) {
    const response = await fetch(base + route, { redirect: 'manual' })
    results.interactions.push({ operation: 'allowed-xr-fallback', route, status: response.status })
    if (response.status !== 200) results.failures.push('Permitted XR fallback unexpectedly unavailable: ' + route)
  }
  if (results.javascriptRequests < 4) results.failures.push('Real compiled Next.js runtime did not load enough JavaScript chunks')
  const home = results.pages.find(p => p.scenario === 'desktop' && p.route === '/home/')
  if (!home || !home.canvas) results.failures.push('Real Home canvas absent; actual WebGL geometry not demonstrated')
} catch (error) {
  results.failures.push('Browser launch or navigation could not complete: ' + String(error).slice(0, 500))
} finally {
  await browser?.close()
  fs.writeFileSync(path.join(evidence, 'browser-results.json'), JSON.stringify(results, null, 2) + '\n')
  console.log(JSON.stringify({ sourceSha: results.sourceSha, pages: results.pages.length, jsRequests: results.javascriptRequests, screenshots: results.screenshots.length, pageErrors: results.pageErrors.length, badNetwork: results.badNetwork.length, failures: results.failures }, null, 2))
}
if (results.failures.length || results.pageErrors.length || results.badNetwork.some(x => x.path.startsWith('/_next/static/'))) process.exitCode = 1
