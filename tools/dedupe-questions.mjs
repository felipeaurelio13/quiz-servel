#!/usr/bin/env node
/**
 * Deduplicate questions.json by removing exact and near-duplicate questions.
 * - Exact duplicate: same question text after normalization (lowercase, no diacritics/punctuation, collapsed spaces)
 * - Near duplicate: high token overlap (Jaccard similarity >= 0.88) after normalization
 *
 * Keeps the entry with the smallest id when duplicates are detected.
 * Creates a timestamped backup before overwriting questions.json.
 */

import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const QUESTIONS_PATH = path.resolve(ROOT, 'questions.json')

function readJson(filePath) {
  const text = fs.readFileSync(filePath, 'utf8')
  return JSON.parse(text)
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 4) + '\n', 'utf8')
}

function timestamp() {
  const d = new Date()
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
}

function removeDiacritics(str) {
  return str.normalize('NFD').replace(/\p{Diacritic}+/gu, '')
}

function normalizeText(str) {
  if (typeof str !== 'string') return ''
  const s1 = removeDiacritics(str.toLowerCase())
  // Remove punctuation and symbols, keep letters, numbers and spaces
  const s2 = s1.replace(/[^\p{L}\p{N}\s]+/gu, ' ')
  return s2.replace(/\s+/g, ' ').trim()
}

function tokenize(str) {
  const clean = normalizeText(str)
  if (!clean) return []
  // Simple tokenization; remove very short tokens
  return clean.split(' ').filter(t => t.length > 1)
}

function jaccard(aTokens, bTokens) {
  if (!aTokens.length && !bTokens.length) return 1
  if (!aTokens.length || !bTokens.length) return 0
  const aSet = new Set(aTokens)
  const bSet = new Set(bTokens)
  let inter = 0
  for (const t of aSet) if (bSet.has(t)) inter++
  const union = aSet.size + bSet.size - inter
  return union === 0 ? 0 : inter / union
}

function levenshtein(a, b) {
  const s = a || ''
  const t = b || ''
  const n = s.length
  const m = t.length
  if (n === 0) return m
  if (m === 0) return n
  const d = Array.from({ length: n + 1 }, () => new Array(m + 1))
  for (let i = 0; i <= n; i++) d[i][0] = i
  for (let j = 0; j <= m; j++) d[0][j] = j
  for (let i = 1; i <= n; i++) {
    const si = s.charCodeAt(i - 1)
    for (let j = 1; j <= m; j++) {
      const tj = t.charCodeAt(j - 1)
      const cost = si === tj ? 0 : 1
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + cost
      )
    }
  }
  return d[n][m]
}

function normalizedLevSim(a, b) {
  const an = normalizeText(a)
  const bn = normalizeText(b)
  const maxLen = Math.max(an.length, bn.length)
  if (maxLen === 0) return 1
  const dist = levenshtein(an, bn)
  return 1 - dist / maxLen
}

function dedupeQuestions(questions, { nearThreshold = 0.88, levThreshold = 0.9 } = {}) {
  const sorted = [...questions].sort((a, b) => (a.id ?? Infinity) - (b.id ?? Infinity))
  const keepers = []
  const removed = []

  for (const q of sorted) {
    const qNorm = normalizeText(q.question)
    const qTokens = tokenize(q.question)

    let isDup = false
    for (let i = 0; i < keepers.length; i++) {
      const k = keepers[i]
      // exact duplicate by normalized text
      if (k._norm === qNorm) {
        removed.push({ removedId: q.id, keptId: k.id, reason: 'exact' })
        isDup = true
        break
      }
      // near-duplicate by token Jaccard or high Levenshtein similarity
      const sim = jaccard(k._tokens, qTokens)
      const lev = normalizedLevSim(k.question, q.question)
      if (sim >= nearThreshold || lev >= levThreshold) {
        // Prefer the one with smaller id
        const preferQ = (q.id ?? Infinity) < (k.id ?? Infinity)
        if (preferQ) {
          removed.push({ removedId: k.id, keptId: q.id, reason: `near(j=${sim.toFixed(2)},l=${lev.toFixed(2)})` })
          // replace keeper
          keepers[i] = { ...q, _norm: qNorm, _tokens: qTokens }
        } else {
          removed.push({ removedId: q.id, keptId: k.id, reason: `near(j=${sim.toFixed(2)},l=${lev.toFixed(2)})` })
        }
        isDup = !preferQ // if we replaced keeper, the current q is now kept
        break
      }
    }

    if (!isDup) {
      keepers.push({ ...q, _norm: qNorm, _tokens: qTokens })
    }
  }

  // strip helper fields
  const cleanKeepers = keepers.map(({ _norm, _tokens, ...rest }) => rest)
  return { kept: cleanKeepers, removed }
}

function main() {
  if (!fs.existsSync(QUESTIONS_PATH)) {
    console.error(`questions.json no encontrado en: ${QUESTIONS_PATH}`)
    process.exit(1)
  }

  const original = readJson(QUESTIONS_PATH)
  if (!Array.isArray(original)) {
    console.error('questions.json no es un arreglo')
    process.exit(1)
  }

  // Allow custom thresholds via CLI: --threshold=0.80 --lev=0.90
  const arg = process.argv.find(a => a.startsWith('--threshold='))
  const argLev = process.argv.find(a => a.startsWith('--lev='))
  const threshold = arg ? Number(arg.split('=')[1]) : 0.88
  const levThreshold = argLev ? Number(argLev.split('=')[1]) : 0.90
  const nearThreshold = Number.isFinite(threshold) && threshold > 0 && threshold < 1 ? threshold : 0.88
  const levT = Number.isFinite(levThreshold) && levThreshold > 0 && levThreshold < 1 ? levThreshold : 0.90
  const { kept, removed } = dedupeQuestions(original, { nearThreshold, levThreshold: levT })

  const ts = timestamp()
  const backupPath = QUESTIONS_PATH.replace(/questions\.json$/, `questions.backup.${ts}.json`)
  fs.copyFileSync(QUESTIONS_PATH, backupPath)

  writeJson(QUESTIONS_PATH, kept)

  // Group removals by keptId for a concise summary
  const grouped = removed.reduce((acc, r) => {
    const key = r.keptId
    acc[key] ||= []
    acc[key].push(r)
    return acc
  }, /** @type {Record<string, Array<{removedId:number, keptId:number, reason:string}>>} */({}))

  console.log(`✅ Deduplicación completa. Conservadas: ${kept.length}, Eliminadas: ${removed.length} (jaccard>=${nearThreshold}, levenshtein>=${levT})`)
  if (removed.length) {
    console.log('Resumen de eliminaciones (agrupado por pregunta conservada):')
    for (const [keptId, items] of Object.entries(grouped)) {
      const reasons = items.map(i => `#${i.removedId} (${i.reason})`).join(', ')
      console.log(`  - Se mantiene #${keptId}; eliminadas: ${reasons}`)
    }
  }
  console.log(`📦 Backup creado: ${path.basename(backupPath)}`)
}

main()
