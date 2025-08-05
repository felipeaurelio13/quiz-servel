// Supabase Client Setup (Replace with your actual URL and Anon Key)
const SUPABASE_URL = 'https://chwkwcqetfeynhvbprlo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNod2t3Y3FldGZleW5odmJwcmxvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY3OTkxNDQsImV4cCI6MjA2MjM3NTE0NH0.WF2P0MkVVcF7tUtLooC4uXBxv-JBT0ggK9YX3NtR3dE';

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

const scoreEl = document.getElementById('score');
const totalQuestionsEl = document.getElementById('total-questions');
const summaryContainer = document.getElementById('summary-container');
const leaderboardContainer = document.getElementById('leaderboard-container'); // Added for ranking
const leaderboardList = document.getElementById('leaderboard-list'); // Added for ranking

const playerNameInput = document.getElementById('player-name-input'); // Added for ranking

const viewLeaderboardBtn = document.getElementById('view-leaderboard-btn'); // For welcome screen leaderboard
const closeLeaderboardBtn = document.getElementById('close-leaderboard-btn'); // To close leaderboard modal

// Quiz State
let allQuestions = []; // All questions fetched from Supabase
let currentQuizQuestions = []; // 15 randomly selected questions for the current quiz
let currentQuestionIndex = 0;
let score = 0;
let userAnswers = []; // To store { question_text, selected_key, correct_key, explanation, is_correct }
let currentPlayerName = 'Anónimo'; // Added for ranking
let currentSelectedAnswer = null; // To track current answer for change functionality
let answerSubmitted = false; // To track if answer has been submitted

// --- SUPABASE CLIENT (minimal, for fetching data) ---
// In a real app, you would use the Supabase JS library for a better experience.
async function fetchFromSupabase(table, columns = '*', order = null, limit = null) {
    let url = `${SUPABASE_URL}/rest/v1/${table}?select=${columns}`;
    if (order) {
        url += `&order=${order}`;
    }
    if (limit) {
        url += `&limit=${limit}`;
    }
    const response = await fetch(url,
        {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            }
        });
    if (!response.ok) {
        console.error('Error fetching data:', await response.json());
        throw new Error('Could not fetch questions from Supabase.');
    }
    return response.json();
}

async function saveToSupabase(table, dataObject) {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}`,
        {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal' // Don't return the inserted object
            },
            body: JSON.stringify(dataObject)
        });
    if (!response.ok) {
        const errorData = await response.json();
        console.error('Error saving data to Supabase:', errorData);
        let detailedMessage = 'Could not save data to Supabase.';
        if (errorData && errorData.message) {
            detailedMessage += ` Server says: ${errorData.message}`;
            if (errorData.details) detailedMessage += ` Details: ${errorData.details}`;
            if (errorData.hint) detailedMessage += ` Hint: ${errorData.hint}`;
        }
        throw new Error(detailedMessage);
    }
    // For POST with Prefer: return=minimal, response body is empty on success (201)
    // console.log('Data saved successfully');
    return response.status === 201; 
}

// --- EVENT LISTENERS ---
startQuizBtn.addEventListener('click', startQuiz);
nextQuestionBtn.addEventListener('click', showNextQuestion);
changeAnswerBtn.addEventListener('click', changeAnswer);
restartQuizBtn.addEventListener('click', restartQuiz);

viewLeaderboardBtn.addEventListener('click', async () => {
    leaderboardContainer.classList.remove('hidden'); // Show modal frame immediately
    await fetchAndDisplayLeaderboard(); // Populate it (will handle loading/empty/error states internally)
});

closeLeaderboardBtn.addEventListener('click', () => {
    leaderboardContainer.classList.add('hidden');
});

// --- QUIZ LOGIC ---
async function initializeQuiz() {
    try {
        showScreen('welcome');
        leaderboardContainer.classList.add('hidden'); // Ensure leaderboard is hidden on initial load if it was somehow left open
        allQuestions = await fetchFromSupabase('questions', 'question_text,options,correct_answer_key,explanation');
        if (!allQuestions || allQuestions.length === 0) {
            showNotification('No se pudieron cargar las preguntas. Intenta de nuevo más tarde.', 'error', 5000);
            return;
        }
        // Shuffle all fetched questions (Fisher-Yates shuffle algorithm for better randomness)
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
    const nameFromInput = playerNameInput.value.trim();
    
    if (!nameFromInput) {
        showNotification('Por favor, ingresa tu nombre o apodo para continuar.', 'warning', 4000);
        playerNameInput.focus(); // Focus on the input field
        return; // Stop the function if no name is entered
    }
    currentPlayerName = nameFromInput;

    leaderboardContainer.classList.add('hidden'); // Ensure leaderboard modal is hidden
    currentQuestionIndex = 0;
    score = 0;
    userAnswers = [];

    // Select 15 random questions for the current quiz session
    const shuffledAllQuestions = [...allQuestions].sort(() => 0.5 - Math.random()); // Create a new shuffled array
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
    optionsContainer.innerHTML = ''; // Clear previous options

    // Shuffle a copy of the options for random display order of content using Fisher-Yates algorithm
    const shuffledOptionsContent = [...currentQuestion.options];
    for (let i = shuffledOptionsContent.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledOptionsContent[i], shuffledOptionsContent[j]] = [shuffledOptionsContent[j], shuffledOptionsContent[i]];
    }

    const displayKeys = ['a', 'b', 'c', 'd']; // Fixed display keys

    shuffledOptionsContent.forEach((option, index) => {
        const button = document.createElement('button');
        button.classList.add('option-btn');
        // Display with fixed a, b, c, d; use original key for logic
        button.textContent = `${displayKeys[index].toUpperCase()}) ${option.text}`;
        button.dataset.key = option.key; // Store the ORIGINAL key for answer checking
        button.addEventListener('click', selectAnswer);
        
        // Staggered animation delay
        button.style.animationDelay = `${index * 0.1}s`;
        
        optionsContainer.appendChild(button);
    });

    const progressPercentage = ((currentQuestionIndex) / currentQuizQuestions.length) * 100;
    progressBar.style.width = `${progressPercentage}%`;
    questionCounterEl.textContent = `Pregunta ${currentQuestionIndex + 1} de ${currentQuizQuestions.length}`;
    
    // Reset answer state
    currentSelectedAnswer = null;
    answerSubmitted = false;
    answerActions.classList.add('hidden');
    changeAnswerBtn.style.display = 'inline-block'; // Reset change button visibility
}

function selectAnswer(event) {
    if (answerSubmitted) return; // Prevent selection if answer is already submitted
    
    const selectedButton = event.target;
    const selectedKey = selectedButton.dataset.key;
    
    // Clear previous selection styling
    Array.from(optionsContainer.children).forEach(btn => {
        btn.classList.remove('selected', 'correct', 'incorrect');
    });
    
    // Mark current selection
    selectedButton.classList.add('selected');
    currentSelectedAnswer = {
        button: selectedButton,
        key: selectedKey
    };
    
    // Show action buttons
    answerActions.classList.remove('hidden');
}

function submitAnswer() {
    if (!currentSelectedAnswer || answerSubmitted) return;
    
    answerSubmitted = true;
    const selectedKey = currentSelectedAnswer.key;
    const currentQuestion = currentQuizQuestions[currentQuestionIndex];
    const correctKey = currentQuestion.correct_answer_key;
    const isCorrect = selectedKey === correctKey;

    // Add answer to user answers array
    userAnswers.push({
        question_text: currentQuestion.question_text,
        selected_key: selectedKey,
        options: currentQuestion.options,
        correct_key: correctKey,
        explanation: currentQuestion.explanation,
        is_correct: isCorrect
    });

    // Update score if correct
    if (isCorrect) {
        score++;
        currentSelectedAnswer.button.classList.remove('selected');
        currentSelectedAnswer.button.classList.add('correct');
    } else {
        currentSelectedAnswer.button.classList.remove('selected');
        currentSelectedAnswer.button.classList.add('incorrect');
        // Highlight the correct answer
        const correctButton = optionsContainer.querySelector(`[data-key='${correctKey}']`);
        if (correctButton) {
            correctButton.classList.add('correct');
        }
    }

    // Disable all option buttons after submission
    Array.from(optionsContainer.children).forEach(btn => {
        btn.classList.add('disabled');
        btn.removeEventListener('click', selectAnswer);
    });

    // Hide change answer button, keep next button
    changeAnswerBtn.style.display = 'none';
}

function changeAnswer() {
    if (answerSubmitted) return;
    
    // Clear current selection
    Array.from(optionsContainer.children).forEach(btn => {
        btn.classList.remove('selected');
    });
    
    currentSelectedAnswer = null;
    answerActions.classList.add('hidden');
}

function showNextQuestion() {
    // If user hasn't submitted their answer yet, submit it first
    if (currentSelectedAnswer && !answerSubmitted) {
        submitAnswer();
        // Use setTimeout to show feedback briefly before moving to next question
        setTimeout(() => {
            currentQuestionIndex++;
            displayQuestion();
        }, 1500); // 1.5 second delay to show correct/incorrect feedback
    } else {
    currentQuestionIndex++;
    displayQuestion();
    }
}

async function showResults() { // Made async to await score saving
    showScreen('results');
    scoreEl.textContent = score;
    totalQuestionsEl.textContent = currentQuizQuestions.length;
    summaryContainer.innerHTML = ''; // Clear previous summary

    userAnswers.forEach(answer => {
        const item = document.createElement('div');
        item.classList.add('summary-item');
        
        let selectedOptionText = 'No respondida';
        const selectedOption = answer.options.find(opt => opt.key === answer.selected_key);
        if (selectedOption) {
            selectedOptionText = selectedOption.text;
        }

        let correctOptionText = 'N/A';
        const correctOption = answer.options.find(opt => opt.key === answer.correct_key);
        if (correctOption) {
            correctOptionText = correctOption.text;
        }

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

    // Save score to Supabase
    if (currentPlayerName && currentPlayerName !== 'Anónimo') { // Only save if a name was provided
        try {
            const scoreData = {
                player_name: currentPlayerName,
                score: score,
                total_questions_in_quiz: currentQuizQuestions.length
                // created_at is handled by default in Supabase
            };
            await saveToSupabase('leaderboard', scoreData);
            console.log('Score saved for player:', currentPlayerName);
            showNotification('¡Puntaje guardado en el ranking!', 'success', 3000);
        } catch (error) {
            console.error('Failed to save score:', error);
            showNotification('No se pudo guardar tu puntaje en el ranking esta vez.', 'warning', 4000);
        }
    }
}

async function fetchAndDisplayLeaderboard() {
    leaderboardList.innerHTML = '<tr class="loading-row"><td colspan="4"><span class="loading-spinner"></span>Cargando ranking...</td></tr>'; // Loading state
    leaderboardContainer.classList.remove('hidden');

    try {
        const leaderboardData = await fetchFromSupabase(
            'leaderboard', 
            'player_name,score,total_questions_in_quiz,created_at', 
            'score.desc,created_at.asc', // Order by score descending, then by date ascending for ties
            50 // Limit to top 50 to prevent excessive loading while allowing more entries
        );

        leaderboardList.innerHTML = ''; // Clear loading/previous state

        if (leaderboardData && leaderboardData.length > 0) {
            leaderboardData.forEach((entry, index) => {
                const row = leaderboardList.insertRow();
                const date = new Date(entry.created_at).toLocaleDateString('es-CL', { year: 'numeric', month: 'short', day: 'numeric' });
                
                const cellPosition = row.insertCell();
                cellPosition.textContent = index + 1;

                const cellName = row.insertCell();
                cellName.textContent = entry.player_name;
                
                const cellScore = row.insertCell();
                cellScore.textContent = `${entry.score}/${entry.total_questions_in_quiz}`;
                
                const cellDate = row.insertCell();
                cellDate.textContent = date;
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
    // To ensure new set of 15 random questions, we can just call startQuiz if user wants a full new random set,
    // or simply go to welcome. For now, going to welcome, startQuiz will then pick new random questions.
    showScreen('welcome'); 
    leaderboardContainer.classList.add('hidden'); // Hide leaderboard modal on restart
}

function showScreen(screenName) {
    welcomeScreen.classList.add('hidden');
    questionScreen.classList.add('hidden');
    resultsScreen.classList.add('hidden');

    if (screenName === 'welcome') {
        welcomeScreen.classList.remove('hidden');
    } else if (screenName === 'question') {
        questionScreen.classList.remove('hidden');
    } else if (screenName === 'results') {
        resultsScreen.classList.remove('hidden');
    }
}

// --- NOTIFICATION SYSTEM ---
function showNotification(message, type = 'info', duration = 3000) {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());
    
    // Create new notification
    const notification = document.createElement('div');
    notification.classList.add('notification', type);
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Show notification
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    // Hide and remove notification
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, duration);
}

// --- INITIALIZE ---
document.addEventListener('DOMContentLoaded', initializeQuiz); 