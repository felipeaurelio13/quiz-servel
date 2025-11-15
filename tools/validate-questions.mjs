#!/usr/bin/env node
import admin from 'firebase-admin'

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: 'quiz-servel'
})

const db = admin.firestore()
const snap = await db.collection('questions').get()

console.log(`Checking ${snap.size} questions for validation issues...\n`)

let invalidCount = 0
let issues = []

snap.docs.forEach((doc, i) => {
  const data = doc.data()
  const problems = []
  
  // Check question_text
  if (!data.question_text || !data.question_text.trim()) {
    problems.push('Missing or empty question_text')
  }
  
  // Check options
  if (!Array.isArray(data.options)) {
    problems.push('options is not an array')
  } else if (data.options.length < 2) {
    problems.push(`Only ${data.options.length} options (need at least 2)`)
  } else {
    data.options.forEach((opt, j) => {
      if (!opt.key) {
        problems.push(`Option ${j} missing key`)
      }
      if (!opt.text && opt.text !== '') {
        problems.push(`Option ${j} missing text field`)
      }
    })
  }
  
  // Check correct_answer_key
  if (!data.correct_answer_key) {
    problems.push('Missing correct_answer_key')
  } else if (Array.isArray(data.options)) {
    const hasMatch = data.options.some(opt => opt.key === data.correct_answer_key)
    if (!hasMatch) {
      problems.push(`correct_answer_key "${data.correct_answer_key}" doesn't match any option key`)
    }
  }
  
  if (problems.length > 0) {
    invalidCount++
    issues.push({
      index: i + 1,
      id: doc.id,
      preview: data.question_text?.substring(0, 60) + '...',
      problems
    })
  }
})

if (invalidCount === 0) {
  console.log('✅ All questions are valid!')
} else {
  console.log(`❌ Found ${invalidCount} invalid questions:\n`)
  issues.forEach(issue => {
    console.log(`Question ${issue.index} (${issue.id}):`)
    console.log(`  "${issue.preview}"`)
    issue.problems.forEach(p => console.log(`  ⚠️  ${p}`))
    console.log()
  })
}

console.log(`\nSummary: ${snap.size - invalidCount}/${snap.size} questions are valid`)
process.exit(0)
