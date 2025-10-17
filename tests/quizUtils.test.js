import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { normalizeQuestionSchema, normalizeQuestionList, calculateProgress } from '../utils/quizUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const questionsPath = path.resolve(__dirname, '../questions.json');

const questionsJson = JSON.parse(await readFile(questionsPath, 'utf8'));

const [firstQuestion] = questionsJson;

test('normalizeQuestionSchema crea una estructura consistente a partir de questions.json', () => {
  const normalized = normalizeQuestionSchema(firstQuestion);

  assert.equal(typeof normalized.question_text, 'string');
  assert.ok(normalized.question_text.length > 0, 'La pregunta debe tener texto.');
  assert.ok(Array.isArray(normalized.options), 'Las opciones deben ser un arreglo.');
  assert.ok(normalized.options.length >= 2, 'Debe haber al menos dos opciones.');
  assert.ok(normalized.options.some(option => option.key === normalized.correct_answer_key), 'La respuesta correcta debe existir en las opciones.');
});

test('normalizeQuestionList descarta entradas sin datos suficientes', () => {
  const withInvalid = [...questionsJson, { question: 'incompleta' }];
  const normalized = normalizeQuestionList(withInvalid);

  assert.equal(normalized.length, questionsJson.length, 'Las preguntas incompletas deben descartarse.');
});

test('calculateProgress maneja correctamente los bordes y valores inválidos', () => {
  assert.equal(calculateProgress(0, 10), 0);
  assert.equal(calculateProgress(5, 10), 50);
  assert.equal(calculateProgress(10, 10), 100);
  assert.equal(calculateProgress(-2, 10), 0);
  assert.equal(calculateProgress(3, 0), 0);
  assert.equal(calculateProgress('3', '6'), 50);
});
