#!/usr/bin/env node
import admin from 'firebase-admin'

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: 'quiz-servel'
})

const db = admin.firestore()

console.log('Checking collections...')
const collections = await db.listCollections()
console.log('Available collections:', collections.map(c => c.id).join(', '))

console.log('\nChecking "questions" collection...')
const questionsSnap = await db.collection('questions').get()
console.log(`Total documents in "questions": ${questionsSnap.size}`)

if (questionsSnap.size > 0) {
  console.log('\nFirst 3 documents:')
  questionsSnap.docs.slice(0, 3).forEach((doc, i) => {
    const data = doc.data()
    console.log(`\n${i+1}. ${data.question_text?.substring(0, 80)}...`)
    console.log(`   Options: ${data.options?.length}`)
    console.log(`   Correct: ${data.correct_answer_key}`)
  })
}

process.exit(0)
