#!/usr/bin/env node
/**
 * Import questions.json into Firestore (project: quiz-servel)
 *
 * Usage:
 *   node tools/import-questions.mjs            # adds documents
 *   node tools/import-questions.mjs --replace  # deletes existing first, then adds
 *
 * Auth:
 *   - Set GOOGLE_APPLICATION_CREDENTIALS to a service account key for quiz-servel, or
 *   - Run `gcloud auth application-default login` and ensure the active project is quiz-servel.
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import process from 'node:process'
import admin from 'firebase-admin'

// Parse flags
const flags = new Set(process.argv.slice(2))
const REPLACE = flags.has('--replace') || flags.has('-r')
const DRY_RUN = flags.has('--dry-run')

// Initialize Admin SDK using ADC and pin projectId to quiz-servel unless provided
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || 'quiz-servel'

let db = null
if (!DRY_RUN) {
  try {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: PROJECT_ID
    })
  } catch (e) {
    // allow re-init when re-running in same process during tests
  }
  db = admin.firestore()
}

// Resolve questions.json at repo root
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')
const QUESTIONS_PATH = path.join(repoRoot, 'questions.json')

function normalizeQuestion(q) {
  // Ensure options array exists
  const options = Array.isArray(q.options) ? q.options : []
  return {
    question_text: q.question ?? q.question_text ?? q.text ?? '',
    options: options.map(opt => ({
      key: opt.key ?? opt.option_key ?? opt.id ?? '',
      text: opt.text ?? opt.label ?? ''
    })),
    correct_answer_key: q.answer ?? q.correct_answer_key ?? q.correctAnswerKey ?? '',
    explanation: q.detail ?? q.explanation ?? ''
  }
}

async function loadQuestions() {
  const raw = await fs.readFile(QUESTIONS_PATH, 'utf8')
  const data = JSON.parse(raw)
  if (!Array.isArray(data)) {
    throw new Error('questions.json must be an array of questions')
  }
  return data.map(normalizeQuestion)
}

async function deleteExisting() {
  console.log('🗑️  Deleting existing documents in collection "questions"...')
  if (DRY_RUN) {
    console.log('   Dry run: skipping delete step')
    return
  }
  const snap = await db.collection('questions').get()
  console.log(`   Found ${snap.size} docs to delete`)

  // Batched deletes (max 500 per batch)
  let count = 0
  let batch = db.batch()
  for (const doc of snap.docs) {
    batch.delete(doc.ref)
    count++
    if (count % 450 === 0) { // commit before hard limit
      await batch.commit()
      batch = db.batch()
      console.log(`   Deleted ${count}/${snap.size}...`)
    }
  }
  if (count % 450 !== 0) {
    await batch.commit()
  }
  console.log(`   Deleted ${count} docs`)
}

async function addQuestions(questions) {
  console.log('⬆️  Uploading documents to collection "questions"...')
  if (DRY_RUN) {
    console.log(`   Would upload ${questions.length} docs`)
    return
  }
  let count = 0
  let batch = db.batch()
  for (const q of questions) {
    const ref = db.collection('questions').doc() // auto-id
    batch.set(ref, q)
    count++
    if (count % 450 === 0) {
      await batch.commit()
      batch = db.batch()
      console.log(`   Uploaded ${count}/${questions.length}...`)
    }
  }
  if (count % 450 !== 0) {
    await batch.commit()
  }
  console.log(`   Uploaded ${count} docs`)
}

async function main() {
  console.log(`📦 Target project: ${PROJECT_ID}`)
  console.log(`📄 Source file: ${path.relative(process.cwd(), QUESTIONS_PATH)}`)
  if (DRY_RUN) console.log('🔎 Dry run: no writes will be performed')

  const questions = await loadQuestions()
  console.log(`📚 Loaded ${questions.length} questions`)

  if (REPLACE) {
    await deleteExisting()
  }

  await addQuestions(questions)
  console.log('✅ Import complete')
}

main().catch(err => {
  console.error('❌ Import failed')
  console.error(err && err.stack || err)
  process.exitCode = 1
})
