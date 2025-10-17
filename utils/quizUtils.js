export function normalizeQuestionSchema(rawQuestion) {
  if (!rawQuestion || typeof rawQuestion !== 'object') {
    throw new TypeError('La pregunta debe ser un objeto.');
  }

  const questionText = extractText(rawQuestion.question_text ?? rawQuestion.question ?? '');
  const explanation = extractText(rawQuestion.explanation ?? rawQuestion.detail ?? '');
  const correctKeyRaw = rawQuestion.correct_answer_key ?? rawQuestion.correctAnswerKey ?? rawQuestion.answer ?? '';
  const correctKey = extractKey(correctKeyRaw);

  const optionsSource = Array.isArray(rawQuestion.options) ? rawQuestion.options : [];
  const options = optionsSource
    .map(option => {
      if (!option || typeof option !== 'object') return null;
      const key = extractKey(option.key ?? option.option_key ?? option.id ?? '');
      const text = extractText(option.text ?? option.label ?? option.value ?? '');
      if (!key || !text) return null;
      return { key, text };
    })
    .filter(Boolean);

  return {
    question_text: questionText,
    options,
    correct_answer_key: correctKey,
    explanation
  };
}

export function normalizeQuestionList(rawList) {
  if (!Array.isArray(rawList)) return [];

  return rawList
    .map(item => {
      try {
        return normalizeQuestionSchema(item);
      } catch (error) {
        return null;
      }
    })
    .filter(question => {
      if (!question) return false;
      if (!question.question_text || !question.correct_answer_key) return false;
      if (!Array.isArray(question.options) || question.options.length === 0) return false;
      return question.options.some(option => option.key === question.correct_answer_key);
    });
}

export function calculateProgress(currentIndex, total) {
  const indexNumber = Number(currentIndex);
  const totalNumber = Number(total);

  if (!Number.isFinite(indexNumber) || !Number.isFinite(totalNumber) || totalNumber <= 0) {
    return 0;
  }

  const clampedIndex = Math.min(Math.max(indexNumber, 0), totalNumber);
  const progress = (clampedIndex / totalNumber) * 100;
  return Math.min(100, Math.max(0, Number(progress.toFixed(2))));
}

function extractText(value) {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
}

function extractKey(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim().toLowerCase();
}
