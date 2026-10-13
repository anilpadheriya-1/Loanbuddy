#!/usr/bin/env node
/**
 * Inspect a built APK (or AAB) for advertising / ad-tracking code and report
 * what is inside it. Exits with code 1 if anything suspicious is found.
 *
 *   node scripts/verify-apk.mjs app.apk [more.apk ...] [--gradle-deps deps.txt] [--report out.md]
 *
 * Checks:
 *  - compiled code (classes*.dex) for known ad SDK class paths;
 *  - the bundled web app (assets/public/**) for ad SDKs and ad-network domains;
 *  - the binary AndroidManifest.xml for permissions beyond the allowed list
 *    (an ad ID permission, for example);
 *  - optionally, the resolved Gradle runtime dependency graph.
 * Prints the SHA-256 of every file it checks.
 * Needs the `unzip` command.
 */
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const SIG = JSON.parse(readFileSync(join(here, 'ad-signatures.json'), 'utf8'))

const args = process.argv.slice(2)
const opt = (name) => {
  const i = args.indexOf(name)
  if (i === -1) return undefined
  const v = args[i + 1]
  args.splice(i, 2)
  return v
}
const gradleDeps = opt('--gradle-deps')
const reportPath = opt('--report')
const files = args
if (files.length === 0) {
  console.error('usage: verify-apk.mjs <app.apk|app.aab> [...] [--gradle-deps deps.txt] [--report out.md]')
  process.exit(2)
}

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const PACKAGE_RES = SIG.packages.map((p) => [p, new RegExp(escape(p).replace(/\\\./g, '[./]'), 'i')])
const DOMAIN_RES = SIG.domains.map((d) => [d, new RegExp(escape(d), 'i')])
const scan = (text, list) => list.filter(([, re]) => re.test(text)).map(([name]) => name)

function walk(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f)
    return statSync(p).isDirectory() ? walk(p) : [p]
  })
}

/** Binary XML stores strings as UTF-16LE (or UTF-8); read both. */
function manifestPermissions(buf) {
  const text = buf.toString('utf16le') + '\n' + buf.toString('latin1')
  return [...new Set([...text.matchAll(/android\.permission\.[A-Z_]+|com\.google\.android\.gms\.permission\.[A-Z_]+/g)].map((m) => m[0]))].sort()
}

const lines = ['# APK ad-free verification', '']
let failed = false
const fail = (msg) => {
  failed = true
  lines.push(`- ❌ ${msg}`)
}

for (const file of files) {
  const buf = readFileSync(file)
  const sha = createHash('sha256').update(buf).digest('hex')
  lines.push(`## ${basename(file)}`, '', `- Size: ${(buf.length / 1024 / 1024).toFixed(2)} MB`, `- SHA-256: \`${sha}\``)

  const dir = mkdtempSync(join(tmpdir(), 'apk-'))
  try {
    execFileSync('unzip', ['-qq', '-o', file, '-d', dir])
    const all = walk(dir)
    const dex = all.filter((f) => /\.dex$/.test(f))
    const web = all.filter((f) => /assets\/public\//.test(f) && /\.(js|html|css|json|webmanifest|txt|svg)$/.test(f))
    const manifest = all.find((f) => /(^|\/)(manifest\/)?AndroidManifest\.xml$/.test(relative(dir, f)))
    lines.push(`- Entries: ${all.length} (dex: ${dex.length}, web assets: ${web.length})`)
    if (dex.length === 0) fail('no classes*.dex found, so the code could not be checked')

    for (const f of dex) {
      const hits = scan(readFileSync(f).toString('latin1'), PACKAGE_RES)
      if (hits.length) fail(`${relative(dir, f)} contains ad SDK code: ${hits.join(', ')}`)
    }
    for (const f of web) {
      const text = readFileSync(f, 'utf8')
      const hits = [...scan(text, PACKAGE_RES), ...scan(text, DOMAIN_RES)]
      if (hits.length) fail(`${relative(dir, f)} references: ${hits.join(', ')}`)
    }
    if (manifest) {
      const perms = manifestPermissions(readFileSync(manifest))
      lines.push(`- Permissions: ${perms.join(', ') || '(none found)'}`)
      const extra = perms.filter((p) => !SIG.permissions.includes(p))
      if (extra.length) fail(`unexpected permissions: ${extra.join(', ')}`)
    } else {
      fail('AndroidManifest.xml not found')
    }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
  lines.push('')
}

if (gradleDeps) {
  const text = readFileSync(gradleDeps, 'utf8')
  const hits = scan(text, PACKAGE_RES)
  lines.push('## Gradle runtime dependency graph', '')
  if (!/---/.test(text)) fail('the Gradle dependency report looks empty')
  if (hits.length) fail(`ad SDKs in the resolved Gradle graph: ${hits.join(', ')}`)
  else lines.push('- No ad SDKs in the resolved dependency graph.')
  lines.push('')
}

lines.push(failed ? '**Result: FAILED.** Advertising or tracking signatures were found (see above).' : '**Result: PASSED.** No ad SDKs, ad domains or extra permissions were found.')
const out = lines.join('\n')
console.log(out)
if (reportPath) writeFileSync(reportPath, out + '\n')
process.exit(failed ? 1 : 0)
