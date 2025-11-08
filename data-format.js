/**
 * 🔍 Data Format Validator
 * 
 * Quick reference for the correct Firestore data format
 */

console.log('📋 Formato correcto de preguntas para Firestore:\n')

const correctFormat = {
  question_text: 'String - El texto de la pregunta',
  options: [
    { key: 'a', text: 'Opción A' },
    { key: 'b', text: 'Opción B' },
    { key: 'c', text: 'Opción C' },
    { key: 'd', text: 'Opción D' }
  ],
  correct_answer_key: 'a', // La key de la respuesta correcta
  explanation: 'String - Explicación de por qué es correcta (opcional)'
}

console.log(JSON.stringify(correctFormat, null, 2))

console.log('\n⚠️  Campos requeridos:')
console.log('  - question_text (no "text")')
console.log('  - options (array de { key, text })')
console.log('  - correct_answer_key (no "correct_key")')
console.log('  - explanation (opcional)')

export { correctFormat }
