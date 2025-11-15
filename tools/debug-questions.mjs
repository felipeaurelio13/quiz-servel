#!/usr/bin/env node
import admin from 'firebase-admin'

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: 'quiz-servel'
})

const db = admin.firestore()
const snap = await db.collection('questions').limit(2).get()

if (snap.empty) {
  console.log('❌ No documents found in collection "questions"')
} else {
  console.log(`✅ Found ${snap.size} documents\n`)
  snap.docs.forEach((doc, i) => {
    const data = doc.data()
    console.log(`Document ${i+1}:`)
    console.log(JSON.stringify(data, null, 2))
    console.log('\nValidation:')
    console.log('  - question_text:', typeof data.question_text, data.question_text ? '✓' : '✗')
    console.log('  - options:', Array.isArray(data.options), 'length:', data.options?.length)
    console.log('  - correct_answer_key:', typeof data.correct_answer_key, data.correct_answer_key ? '✓' : '✗')
    console.log('  - explanation:', typeof data.explanation)
    if (data.options && data.options.length > 0) {
      console.log('  - First option:', JSON.stringify(data.options[0]))
    }
    console.log()
  })
}

process.exit(0)
