#!/usr/bin/env node
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const file = path.resolve(process.cwd(), 'questions.json')

async function main() {
  const raw = await fs.readFile(file, 'utf8')
  const data = JSON.parse(raw)
  if (!Array.isArray(data)) {
    throw new Error('questions.json must be an array')
  }
  const updated = data.map((q, i) => ({ ...q, id: i + 1 }))
  await fs.writeFile(file, JSON.stringify(updated, null, 4) + '\n')
  console.log(`Renumbered ${updated.length} questions (1..${updated.length}) in questions.json`)
}

main().catch(err => { console.error(err); process.exit(1) })
