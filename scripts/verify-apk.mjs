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

/**
 * Read the permissions the app *requests* (<uses-permission>) from a compiled
 * (binary XML) AndroidManifest.xml. Permission names that only appear as
 * attribute values (e.g. a receiver protected by android.permission.DUMP)
 * are not requests and are ignored. Returns null if the file is not binary XML
 * (an .aab stores the manifest as protobuf).
 */
function requestedPermissions(buf) {
  if (buf.length < 8 || buf.readUInt16LE(0) !== 0x0003) return null
  let strings = []
  const perms = []
  let off = buf.readUInt16LE(2)
  while (off + 8 <= buf.length) {
    const type = buf.readUInt16LE(off)
    const headerSize = buf.readUInt16LE(off + 2)
    const size = buf.readUInt32LE(off + 4)
    if (size === 0) break
    if (type === 0x0001) strings = readStringPool(buf, off)
    if (type === 0x0102) {
      const ext = off + headerSize
      const name = strings[buf.readUInt32LE(ext + 4)]
      const attrStart = buf.readUInt16LE(ext + 8)
      const attrSize = buf.readUInt16LE(ext + 10)
      const attrCount = buf.readUInt16LE(ext + 12)
      if (name === 'uses-permission' || name === 'uses-permission-sdk-23') {
        for (let i = 0; i < attrCount; i++) {
          const a = ext + attrStart + i * attrSize
          if (strings[buf.readUInt32LE(a + 4)] !== 'name') continue
          const raw = buf.readUInt32LE(a + 8)
          const dataType = buf.readUInt8(a + 15)
          const value = raw !== 0xffffffff ? strings[raw] : dataType === 0x03 ? strings[buf.readUInt32LE(a + 16)] : undefined
          if (value) perms.push(value)
        }
      }
    }
    off += size
  }
  return [...new Set(perms)].sort()
}

function readStringPool(buf, off) {
  const headerSize = buf.readUInt16LE(off + 2)
  const count = buf.readUInt32LE(off + 8)
  const utf8 = (buf.readUInt32LE(off + 16) & 0x100) !== 0
  const stringsStart = off + buf.readUInt32LE(off + 20)
  const out = []
  for (let i = 0; i < count; i++) {
    let p = stringsStart + buf.readUInt32LE(off + headerSize + i * 4)
    if (utf8) {
      p += buf[p] & 0x80 ? 2 : 1 // UTF-16 length (skipped)
      let len = buf[p]
      if (len & 0x80) {
        len = ((len & 0x7f) << 8) | buf[p + 1]
        p += 2
      } else p += 1
      out.push(buf.toString('utf8', p, p + len))
    } else {
      let len = buf.readUInt16LE(p)
      if (len & 0x8000) {
        len = ((len & 0x7fff) << 16) | buf.readUInt16LE(p + 2)
        p += 4
      } else p += 2
      out.push(buf.toString('utf16le', p, p + len * 2))
    }
  }
  return out
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
      const mbuf = readFileSync(manifest)
      const perms = requestedPermissions(mbuf)
      if (perms === null) {
        lines.push('- Permissions: manifest is not binary XML (bundle); permissions are checked on the APK built from the same manifest')
      } else {
        lines.push(`- Requested permissions: ${perms.join(', ') || '(none)'}`)
        // AndroidX adds <applicationId>.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION, a signature-level guard the app defines for itself.
        const appOwn = (p) => !p.startsWith('android.') && !p.startsWith('com.google.') && SIG.allowedAppPermissions.some((s) => p.endsWith(`.${s}`))
        const extra = perms.filter((p) => !SIG.permissions.includes(p) && !appOwn(p))
        if (extra.length) fail(`unexpected permissions requested: ${extra.join(', ')}`)
        if (!perms.length) fail('no permissions parsed from the manifest; the parser may be out of date')
      }
      const ads = scan(mbuf.toString('utf16le') + mbuf.toString('latin1'), PACKAGE_RES)
      if (ads.length) fail(`AndroidManifest.xml references ad SDKs: ${ads.join(', ')}`)
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
