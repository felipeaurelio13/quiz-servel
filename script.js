// Firebase SDK (via CDN ESM)
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import {
    getFirestore,
    collection,
    getDocs,
    query,
    orderBy,
    limit as fbLimit,
    addDoc,
    serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';
import {
    getStreakNotification,
    formatLeaderboardEntry,
    calculateProgressPercentage
} from './utils/quizHelpers.js';

// Firebase Config - REEMPLAZA con tu configuración de app web (Firebase Console > Project settings > Your apps)
const firebaseConfig = {
    apiKey: "AIzaSyB64Cy-_BGVuki1OF8CBZI0N1HHwvXFpo4",
    authDomain: "quiz-servel-app.firebaseapp.com",
    projectId: "quiz-servel-app",
    storageBucket: "quiz-servel-app.firebasestorage.app",
    messagingSenderId: "914422302247",
    appId: "1:914422302247:web:a42e492e754aca33367002"
};

let db = null;
function initializeFirebase() {
    if (db) return db;
    try {
        if (!firebaseConfig || firebaseConfig.apiKey === 'YOUR_API_KEY') {
            showNotification('Configura Firebase en script.js antes de usar la app.', 'warning', 6000);
            return null;
        }
        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        return db;
    } catch (error) {
        console.error('Firebase init error:', error);
        showNotification('Error al inicializar Firebase. Revisa tu configuración.', 'error', 6000);
        return null;
    }
}

// --- SEEDING (cargar preguntas desde questions.json) ---
async function seedQuestionsFromLocalJson() {
    try {
        const database = initializeFirebase();
        if (!database) throw new Error('Firebase no configurado');
        const existing = await getDocs(collection(database, 'questions'));
        if (!existing.empty) {
            showNotification('Seed omitido: ya existen preguntas en Firestore.', 'info', 4000);
            return;
        }
        showNotification('Sembrando preguntas, espera un momento...', 'info', 4000);
        const resp = await fetch('questions.json', { cache: 'no-cache' });
        if (!resp.ok) throw new Error('No se pudo leer questions.json');
        const items = await resp.json();
        const toInsert = Array.isArray(items) ? items : [];
        for (const q of toInsert) {
            const docData = {
                question_text: q.question || q.question_text,
                options: q.options || [],
                correct_answer_key: q.correctAnswerKey || q.correct_answer_key,
                explanation: q.explanation || ''
            };
            if (!docData.question_text || !docData.correct_answer_key || !Array.isArray(docData.options)) {
                continue;
            }
            await addDoc(collection(database, 'questions'), docData);
        }
        showNotification('Seed completado: preguntas cargadas en Firestore.', 'success', 5000);
    } catch (e) {
        console.error('Seed error:', e);
        showNotification('Error al sembrar preguntas. Revisa la consola.', 'error', 5000);
    }
}

// HTML Elements
const welcomeScreen = document.getElementById('welcome-screen');
const questionScreen = document.getElementById('question-screen');
const resultsScreen = document.getElementById('results-screen');

const startQuizBtn = document.getElementById('start-quiz-btn');
const nextQuestionBtn = document.getElementById('next-question-btn');
const changeAnswerBtn = document.getElementById('change-answer-btn');
const answerActions = document.getElementById('answer-actions');
const restartQuizBtn = document.getElementById('restart-quiz-btn');

const progressBar = document.getElementById('progress-bar');
const questionCounterEl = document.getElementById('question-counter');
const questionTextEl = document.getElementById('question-text');
const optionsContainer = document.getElementById('options-container');
const inlineExplanation = document.getElementById('inline-explanation');
const correctCountEl = document.getElementById('correct-count');
const incorrectCountEl = document.getElementById('incorrect-count');

const scoreEl = document.getElementById('score');
const totalQuestionsEl = document.getElementById('total-questions');
const summaryContainer = document.getElementById('summary-container');
const leaderboardContainer = document.getElementById('leaderboard-container');
const leaderboardList = document.getElementById('leaderboard-list');
const leaderboardBackdrop = document.getElementById('leaderboard-backdrop');

const playerNameInput = document.getElementById('player-name-input');

const viewLeaderboardBtn = document.getElementById('view-leaderboard-btn');
const closeLeaderboardBtn = document.getElementById('close-leaderboard-btn');

// Quiz State
let allQuestions = [];
let currentQuizQuestions = [];
let currentQuestionIndex = 0;
let score = 0;
let userAnswers = [];
let currentPlayerName = 'Anónimo';
let currentSelectedAnswer = null;
let answerSubmitted = false;
let consecutiveCorrectCount = 0;
let longestStreak = 0;
let correctCount = 0;
let incorrectCount = 0;
let questionsLoadPromise = null;

// --- Firestore helpers ---
async function fetchQuestions() {
    const database = initializeFirebase();
    if (!database) throw new Error('Firebase no configurado');
    const snapshot = await getDocs(collection(database, 'questions'));
    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            question_text: data.question_text,
            options: data.options,
            correct_answer_key: data.correct_answer_key,
            explanation: data.explanation || ''
        };
    });
}

async function saveLeaderboardScore(dataObject) {
    const database = initializeFirebase();
    if (!database) throw new Error('Firebase no configurado');
    await addDoc(collection(database, 'leaderboard'), { ...dataObject, created_at: serverTimestamp() });
    return true;
}

async function fetchLeaderboardTop() {
    const database = initializeFirebase();
    if (!database) throw new Error('Firebase no configurado');
    try {
        const q = query(
            collection(database, 'leaderboard'),
            orderBy('score', 'desc'),
            orderBy('created_at', 'asc'),
            fbLimit(50)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => d.data());
    } catch (e) {
        console.warn('Fallo índice compuesto, usando orden simple:', e?.message);
        const q = query(
            collection(database, 'leaderboard'),
            orderBy('score', 'desc'),
            fbLimit(50)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => d.data());
    }
}

// --- EVENT LISTENERS ---
startQuizBtn.addEventListener('click', startQuiz);
nextQuestionBtn.addEventListener('click', showNextQuestion);
changeAnswerBtn.addEventListener('click', changeAnswer);
restartQuizBtn.addEventListener('click', restartQuiz);

viewLeaderboardBtn.addEventListener('click', async () => {
    await openLeaderboard();
});

closeLeaderboardBtn.addEventListener('click', () => {
    closeLeaderboard();
});

if (leaderboardBackdrop) {
    leaderboardBackdrop.addEventListener('click', () => {
        closeLeaderboard();
    });
}

document.addEventListener('keydown', handleKeyboardShortcuts);
document.addEventListener('keydown', handleEscapeClose);

// --- QUIZ LOGIC ---
async function initializeQuiz() {
    try {
        showScreen('welcome');
        leaderboardContainer.classList.add('hidden');
        optionsContainer.setAttribute('role', 'listbox');
        const savedName = localStorage.getItem('player_name');
        if (savedName) playerNameInput.value = savedName;
        setStartButtonLoading(true);
        questionsLoadPromise = fetchQuestions();
        allQuestions = await questionsLoadPromise;
        questionsLoadPromise = null;
        setStartButtonLoading(false);
        if (!allQuestions || allQuestions.length === 0) {
            showNotification('No se pudieron cargar las preguntas. Intenta de nuevo más tarde.', 'error', 5000);
            return;
        }
        for (let i = allQuestions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allQuestions[i], allQuestions[j]] = [allQuestions[j], allQuestions[i]];
        }
    } catch (error) {
        console.error('Initialization Error:', error);
        showNotification('Error al inicializar el quiz. Por favor, recarga la página.', 'error', 5000);
    }
}

function startQuiz() {
    // Ensure questions are loaded before starting
    if (!allQuestions || allQuestions.length === 0) {
        if (questionsLoadPromise) {
            setStartButtonLoading(true);
            questionsLoadPromise.then(() => {
                setStartButtonLoading(false);
                if (!allQuestions || allQuestions.length === 0) {
                    showNotification('No se pudieron cargar las preguntas. Intenta de nuevo más tarde.', 'error', 4000);
                    return;
                }
                startQuiz();
            }).catch(() => {
                setStartButtonLoading(false);
                showNotification('Error al cargar preguntas. Intenta nuevamente.', 'error', 4000);
            });
            return;
        } else {
            showNotification('No se pudieron cargar las preguntas. Intenta de nuevo más tarde.', 'error', 4000);
            return;
        }
    }
    const nameFromInput = playerNameInput.value.trim();
    if (!nameFromInput) {
        showNotification('Por favor, ingresa tu nombre o apodo para continuar.', 'warning', 4000);
        playerNameInput.focus();
        return;
    }
    currentPlayerName = nameFromInput;
    localStorage.setItem('player_name', currentPlayerName);

    leaderboardContainer.classList.add('hidden');
    currentQuestionIndex = 0;
    score = 0;
    userAnswers = [];
    correctCount = 0;
    incorrectCount = 0;
    consecutiveCorrectCount = 0;
    longestStreak = 0;
    updateLiveStats();

    const shuffledAllQuestions = [...allQuestions].sort(() => 0.5 - Math.random());
    currentQuizQuestions = shuffledAllQuestions.slice(0, Math.min(15, allQuestions.length));

    if (currentQuizQuestions.length === 0) {
        showNotification("No hay preguntas disponibles para iniciar el quiz.", 'error', 4000);
        showScreen('welcome');
        return;
    }

    showScreen('question');
    displayQuestion();
}

function displayQuestion() {
    if (currentQuestionIndex >= currentQuizQuestions.length) {
        showResults();
        return;
    }

    const currentQuestion = currentQuizQuestions[currentQuestionIndex];
    questionTextEl.textContent = currentQuestion.question_text;
    optionsContainer.innerHTML = '';
    inlineExplanation.classList.add('hidden');
    inlineExplanation.textContent = '';

    const shuffledOptionsContent = [...currentQuestion.options];
    for (let i = shuffledOptionsContent.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledOptionsContent[i], shuffledOptionsContent[j]] = [shuffledOptionsContent[j], shuffledOptionsContent[i]];
    }

    const displayKeys = ['a', 'b', 'c', 'd'];

    shuffledOptionsContent.forEach((option, index) => {
        const button = document.createElement('button');
        button.classList.add('option-btn');
        button.dataset.key = option.key;
        button.setAttribute('role', 'option');
        const letterBadge = document.createElement('span');
        letterBadge.className = 'option-letter';
        const fallbackKey = typeof option.key === 'string' && option.key.length > 0
            ? option.key.toUpperCase()
            : String(index + 1);
        const letter = displayKeys[index]?.toUpperCase() || fallbackKey;
        letterBadge.textContent = letter;
        letterBadge.setAttribute('aria-hidden', 'true');
        const optionText = document.createElement('span');
        optionText.className = 'option-text';
        optionText.textContent = option.text;
        button.setAttribute('aria-label', letter ? `${letter}) ${option.text}` : option.text);
        button.append(letterBadge, optionText);
        button.addEventListener('click', selectAnswer);
        button.style.animationDelay = `${index * 0.1}s`;
        optionsContainer.appendChild(button);
    });

    updateProgressBar(currentQuestionIndex, currentQuizQuestions.length);
    questionCounterEl.textContent = `Pregunta ${currentQuestionIndex + 1} de ${currentQuizQuestions.length}`;

    currentSelectedAnswer = null;
    answerSubmitted = false;
    answerActions.classList.add('hidden');
    nextQuestionBtn.textContent = 'Confirmar respuesta';
    nextQuestionBtn.disabled = true;

    // focus first option for accessibility
    const firstOption = optionsContainer.querySelector('.option-btn');
    if (firstOption) firstOption.focus();
}

function selectAnswer(event) {
    if (answerSubmitted) return;
    const selectedButton = event.target;
    const selectedKey = selectedButton.dataset.key;

    Array.from(optionsContainer.children).forEach(btn => {
        btn.classList.remove('selected', 'correct', 'incorrect');
        btn.setAttribute('aria-pressed', 'false');
    });

    selectedButton.classList.add('selected');
    selectedButton.setAttribute('aria-pressed', 'true');
    currentSelectedAnswer = { button: selectedButton, key: selectedKey };
    answerActions.classList.remove('hidden');
    nextQuestionBtn.disabled = false; // user can confirm now
}

function submitAnswer() {
    if (!currentSelectedAnswer || answerSubmitted) return;

    answerSubmitted = true;
    const selectedKey = currentSelectedAnswer.key;
    const currentQuestion = currentQuizQuestions[currentQuestionIndex];
    const correctKey = currentQuestion.correct_answer_key;
    const isCorrect = selectedKey === correctKey;

    userAnswers.push({
        question_text: currentQuestion.question_text,
        selected_key: selectedKey,
        options: currentQuestion.options,
        correct_key: correctKey,
        explanation: currentQuestion.explanation,
        is_correct: isCorrect
    });

    if (isCorrect) {
        score++;
        consecutiveCorrectCount++;
        if (consecutiveCorrectCount > longestStreak) longestStreak = consecutiveCorrectCount;
        correctCount++;
        currentSelectedAnswer.button.classList.remove('selected');
        currentSelectedAnswer.button.classList.add('correct');
        maybeCelebrateStreak(consecutiveCorrectCount);
    } else {
        consecutiveCorrectCount = 0;
        incorrectCount++;
        currentSelectedAnswer.button.classList.remove('selected');
        currentSelectedAnswer.button.classList.add('incorrect');
        const correctButton = optionsContainer.querySelector(`[data-key='${correctKey}']`);
        if (correctButton) correctButton.classList.add('correct');
        // show inline explanation immediately
        const correctOption = currentQuestion.options.find(o => o.key === correctKey);
        inlineExplanation.innerHTML = `<strong>Explicación:</strong> ${currentQuestion.explanation || 'No disponible.'}` + (correctOption ? `<br><strong>Respuesta correcta:</strong> ${correctOption.text} (${correctKey.toUpperCase()})` : '');
        inlineExplanation.classList.remove('hidden');
    }

    Array.from(optionsContainer.children).forEach(btn => {
        btn.classList.add('disabled');
        btn.setAttribute('disabled', 'true');
        btn.removeEventListener('click', selectAnswer);
    });

    nextQuestionBtn.focus();
    updateLiveStats();
}

function changeAnswer() {
    if (answerSubmitted) return;
    Array.from(optionsContainer.children).forEach(btn => btn.classList.remove('selected'));
    currentSelectedAnswer = null;
    answerActions.classList.add('hidden');
}

function showNextQuestion() {
    // First click confirms; second click avanza
    if (currentSelectedAnswer && !answerSubmitted) {
        submitAnswer();
        nextQuestionBtn.textContent = 'Siguiente pregunta';
        nextQuestionBtn.disabled = false;
        return;
    }
    // If already submitted, go next
    currentQuestionIndex++;
    displayQuestion();
}

async function showResults() {
    showScreen('results');
    scoreEl.textContent = score;
    totalQuestionsEl.textContent = currentQuizQuestions.length;
    summaryContainer.innerHTML = '';
    if (longestStreak >= 3) {
        const badge = document.createElement('div');
        badge.className = 'summary-item';
        badge.innerHTML = `<p><strong>🔥 Racha máxima:</strong> ${longestStreak} correctas seguidas. ¡Buen ritmo!</p>`;
        summaryContainer.appendChild(badge);
    }

    userAnswers.forEach(answer => {
        const item = document.createElement('div');
        item.classList.add('summary-item');

        let selectedOptionText = 'No respondida';
        const selectedOption = answer.options.find(opt => opt.key === answer.selected_key);
        if (selectedOption) selectedOptionText = selectedOption.text;

        let correctOptionText = 'N/A';
        const correctOption = answer.options.find(opt => opt.key === answer.correct_key);
        if (correctOption) correctOptionText = correctOption.text;

        item.innerHTML = `
            <p class="question-summary">${answer.question_text}</p>
            <p class="user-answer ${answer.is_correct ? 'correct' : 'incorrect'}">
                Tu respuesta: ${selectedOptionText} (${answer.selected_key.toUpperCase()})
                ${answer.is_correct ? '<span class="feedback-icon">✔</span>' : '<span class="feedback-icon">✘</span>'}
            </p>
            ${!answer.is_correct ? `<p class="correct-answer-summary">Respuesta correcta: ${correctOptionText} (${answer.correct_key.toUpperCase()})</p>` : ''}
            <p class="explanation-summary">Explicación: ${answer.explanation || 'No disponible.'}</p>
        `;
        summaryContainer.appendChild(item);
    });

    updateProgressBar(currentQuizQuestions.length, currentQuizQuestions.length);

    if (currentPlayerName && currentPlayerName !== 'Anónimo') {
        try {
            const scoreData = {
                player_name: currentPlayerName,
                score: score,
                total_questions_in_quiz: currentQuizQuestions.length
            };
            await saveLeaderboardScore(scoreData);
            showNotification('¡Puntaje guardado en el ranking!', 'success', 3000);
        } catch (error) {
            console.error('Failed to save score:', error);
            showNotification('No se pudo guardar tu puntaje en el ranking esta vez.', 'warning', 4000);
        }
    }
}

async function fetchAndDisplayLeaderboard() {
    leaderboardList.innerHTML = '<tr class="loading-row"><td colspan="4"><span class="loading-spinner"></span>Cargando ranking...</td></tr>';

    try {
        const leaderboardData = await fetchLeaderboardTop();
        leaderboardList.innerHTML = '';
        if (leaderboardData && leaderboardData.length > 0) {
            leaderboardData.forEach((entry, index) => {
                const formatted = formatLeaderboardEntry(entry, index);
                const row = leaderboardList.insertRow();

                const cellPosition = row.insertCell();
                cellPosition.textContent = formatted.position;
                const cellName = row.insertCell();
                cellName.textContent = formatted.playerName;
                const cellScore = row.insertCell();
                cellScore.textContent = formatted.scoreText;
                const cellDate = row.insertCell();
                cellDate.textContent = formatted.formattedDate;
            });
        } else {
            leaderboardList.innerHTML = '<tr><td colspan="4">No hay puntajes en el ranking todavía. ¡Sé el primero!</td></tr>';
        }
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        leaderboardList.innerHTML = '<tr class="loading-row"><td colspan="4">❌ No se pudo cargar el ranking. Intenta más tarde.</td></tr>';
        showNotification('Error al cargar el ranking. Verifica tu conexión.', 'error', 4000);
    }
}

function restartQuiz() {
    showScreen('welcome');
    leaderboardContainer.classList.add('hidden');
}

function showScreen(screenName) {
    welcomeScreen.classList.add('hidden');
    questionScreen.classList.add('hidden');
    resultsScreen.classList.add('hidden');

    if (screenName === 'welcome') {
        welcomeScreen.classList.remove('hidden');
        playerNameInput.focus();
    } else if (screenName === 'question') {
        questionScreen.classList.remove('hidden');
    } else if (screenName === 'results') {
        resultsScreen.classList.remove('hidden');
    }
}

// --- NOTIFICATION SYSTEM ---
function showNotification(message, type = 'info', duration = 3000) {
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());

    const notification = document.createElement('div');
    notification.classList.add('notification', type);
    notification.textContent = message;
    notification.setAttribute('role', 'status');
    notification.setAttribute('aria-live', 'polite');
    notification.setAttribute('aria-atomic', 'true');

    document.body.appendChild(notification);

    setTimeout(() => { notification.classList.add('show'); }, 100);
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => { if (notification.parentNode) notification.parentNode.removeChild(notification); }, 300);
    }, duration);
}

function maybeCelebrateStreak(streak) {
    const notification = getStreakNotification(streak);
    if (notification) {
        showNotification(notification.message, notification.type, notification.duration);
    }
}

function updateLiveStats() {
    if (correctCountEl) correctCountEl.textContent = String(correctCount);
    if (incorrectCountEl) incorrectCountEl.textContent = String(incorrectCount);
}

function updateProgressBar(currentIndex, totalQuestions) {
    if (!progressBar) return;
    const percent = calculateProgressPercentage(currentIndex, totalQuestions);
    progressBar.style.width = `${percent}%`;
    progressBar.setAttribute('role', 'progressbar');
    progressBar.setAttribute('aria-valuemin', '0');
    progressBar.setAttribute('aria-valuemax', '100');
    progressBar.setAttribute('aria-valuenow', String(percent));
    progressBar.setAttribute('aria-label', 'Progreso del quiz');
}

function setStartButtonLoading(isLoading) {
    if (!startQuizBtn) return;
    if (isLoading) {
        startQuizBtn.disabled = true;
        startQuizBtn.dataset.originalText = startQuizBtn.textContent;
        startQuizBtn.textContent = 'Cargando preguntas...';
    } else {
        startQuizBtn.disabled = false;
        if (startQuizBtn.dataset.originalText) {
            startQuizBtn.textContent = startQuizBtn.dataset.originalText;
            delete startQuizBtn.dataset.originalText;
        }
    }
}

// Keyboard shortcuts: 1-4 select, Enter -> next/submit
function handleKeyboardShortcuts(e) {
    if (questionScreen.classList.contains('hidden')) return;
    const map = { '1': 0, '2': 1, '3': 2, '4': 3 };
    if (map[e.key] !== undefined) {
        const btn = optionsContainer.querySelectorAll('.option-btn')[map[e.key]];
        if (btn && !btn.classList.contains('disabled')) btn.click();
    }
    if (e.key === 'Enter' && !nextQuestionBtn.disabled) {
        showNextQuestion();
    }
}

function handleEscapeClose(e) {
    if (e.key === 'Escape' && !leaderboardContainer.classList.contains('hidden')) {
        closeLeaderboard();
    }
}

async function openLeaderboard() {
    leaderboardContainer.classList.remove('hidden');
    if (leaderboardBackdrop) leaderboardBackdrop.classList.remove('hidden');
    document.body.classList.add('modal-open');
    if (viewLeaderboardBtn) viewLeaderboardBtn.setAttribute('aria-expanded', 'true');
    await fetchAndDisplayLeaderboard();
    if (closeLeaderboardBtn) closeLeaderboardBtn.focus();
}

function closeLeaderboard() {
    leaderboardContainer.classList.add('hidden');
    if (leaderboardBackdrop) leaderboardBackdrop.classList.add('hidden');
    document.body.classList.remove('modal-open');
    if (viewLeaderboardBtn) viewLeaderboardBtn.setAttribute('aria-expanded', 'false');
    if (viewLeaderboardBtn) viewLeaderboardBtn.focus();
}

// --- INITIALIZE ---
document.addEventListener('DOMContentLoaded', initializeQuiz);

// Trigger seeding if ?seed=1 is in URL
try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('seed') === '1') {
        seedQuestionsFromLocalJson();
    }
} catch (_) {}