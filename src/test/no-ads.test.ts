import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * The app must stay ad-free and tracker-free. This scans everything that ends
 * up in the website or the Android APK: npm's fully resolved dependency graph,
 * the Gradle build files, the Android manifest, the HTML shell, public assets
 * and our own source. The APK itself is checked in CI by scripts/verify-apk.mjs.
 */
const ROOT = join(__dirname, '..', '..')
const SIG = JSON.parse(readFileSync(join(ROOT, 'scripts/ad-signatures.json'), 'utf8')) as {
  packages: string[]
  domains: string[]
  permissions: string[]
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
// Package names match with either '.' or '/' separators (Java class paths).
const PATTERNS = [
  ...SIG.packages.map((p) => new RegExp(escape(p).replace(/\\\./g, '[./]'), 'i')),
  ...SIG.domains.map((d) => new RegExp(escape(d), 'i')),
]

function findSignatures(text: string): string[] {
  return PATTERNS.filter((re) => re.test(text)).map((re) => re.source)
}

function walk(dir: string, filter: (f: string) => boolean): string[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f)
    if (statSync(p).isDirectory()) return ['node_modules', 'build', '.gradle', 'assets'].includes(f) ? [] : walk(p, filter)
    return filter(f) ? [p] : []
  })
}

describe('no advertising or ad-tracking code', () => {
  it('detects a known ad SDK and ad domain (self-check)', () => {
    expect(findSignatures('implementation "com.google.android.gms:play-services-ads:23.0.0"')).not.toEqual([])
    expect(findSignatures('Lcom/google/android/gms/ads/AdView;')).not.toEqual([])
    expect(findSignatures('<script src="https://pagead2.googlesyndication.com/x.js">')).not.toEqual([])
    expect(findSignatures('import { formatINR } from "@/lib/format"')).toEqual([])
  })

  it('no resolved npm package is an ad or ad-tracking SDK', () => {
    const lock = JSON.parse(readFileSync(join(ROOT, 'package-lock.json'), 'utf8')) as { packages: Record<string, { resolved?: string }> }
    const names = Object.keys(lock.packages).filter(Boolean)
    expect(names.length).toBeGreaterThan(50)
    const hits = names.filter((n) => findSignatures(n).length > 0 || /(^|\/)(@capacitor-community\/admob|react-native-google-mobile-ads|admob[^/]*)$/i.test(n))
    expect(hits).toEqual([])
    const pkg = readFileSync(join(ROOT, 'package.json'), 'utf8')
    expect(findSignatures(pkg)).toEqual([])
  })

  it('Android build files, manifest and Capacitor config contain no ad SDKs', () => {
    const files = [
      ...walk(join(ROOT, 'android'), (f) => /\.(gradle|xml|properties|java|kt)$/.test(f)),
      join(ROOT, 'capacitor.config.ts'),
    ]
    expect(files.some((f) => f.endsWith('AndroidManifest.xml'))).toBe(true)
    for (const f of files) {
      expect(findSignatures(readFileSync(f, 'utf8')), relative(ROOT, f)).toEqual([])
    }
    expect(existsSync(join(ROOT, 'android/app/google-services.json')), 'no Firebase/Google services config').toBe(false)
  })

  it('the Android app asks only for the internet permission (no ad ID, location or contacts)', () => {
    const manifest = readFileSync(join(ROOT, 'android/app/src/main/AndroidManifest.xml'), 'utf8')
    const perms = [...manifest.matchAll(/uses-permission[^>]*android:name="([^"]+)"/g)].map((m) => m[1]).sort()
    expect(perms).toEqual([...SIG.permissions].sort())
    expect(manifest).not.toMatch(/AD_ID|com\.google\.android\.gms\.ads/)
  })

  it('the web app (HTML shell, public assets, source) loads no ad scripts', () => {
    const files = [
      join(ROOT, 'index.html'),
      ...walk(join(ROOT, 'public'), () => true),
      ...walk(join(ROOT, 'src'), (f) => /\.(ts|tsx|css|html)$/.test(f) && !/no-ads\.test\.ts$/.test(f)),
    ]
    for (const f of files) {
      expect(findSignatures(readFileSync(f, 'utf8')), relative(ROOT, f)).toEqual([])
    }
  })
})
