const DEFAULT_DURATION = 2200;

function toNonNegativeNumber(value) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return 0;
    return Math.max(0, numericValue);
}

function formatPercentValue(value) {
    if (!Number.isFinite(value)) return '0%';
    const clamped = Math.max(0, Math.min(100, value));
    return `${clamped.toFixed(2).replace(/\.?0+$/, '')}%`;
}

/**
 * Returns the notification metadata for a given streak length.
 * @param {number} streak
 * @returns {{message: string, type: 'success' | 'info', duration: number} | null}
 */
export function getStreakNotification(streak) {
    if (typeof streak !== 'number' || streak <= 0) return null;

    const milestones = {
        3: {
            message: '¡3 respuestas correctas seguidas! 🔥',
            type: 'success',
            duration: DEFAULT_DURATION
        },
        5: {
            message: '¡Racha de 5! Estás imparable 👏',
            type: 'success',
            duration: DEFAULT_DURATION + 300
        }
    };

    if (milestones[streak]) return milestones[streak];

    if (streak % 10 === 0) {
        return {
            message: `¡${streak} correctas seguidas! 🏆`,
            type: 'success',
            duration: DEFAULT_DURATION + 500
        };
    }

    return null;
}

/**
 * Normalizes and formats leaderboard entries so the UI can render them safely.
 * @param {object} entry Raw entry from Firestore.
 * @param {number} index Zero-based index of the entry in the sorted array.
 * @param {string} locale Locale for the formatted date (defaults to es-CL).
 */
export function formatLeaderboardEntry(entry, index, locale = 'es-CL') {
    const safeEntry = entry || {};
    const playerName = typeof safeEntry.player_name === 'string' && safeEntry.player_name.trim().length > 0
        ? safeEntry.player_name.trim()
        : 'Anónimo';

    const scoreValue = toNonNegativeNumber(safeEntry.score);
    const totalQuestions = toNonNegativeNumber(safeEntry.total_questions_in_quiz);

    const createdAt = extractDate(safeEntry.created_at);
    const formatter = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' });
    const accuracyPercent = calculateProgressPercentage(scoreValue, totalQuestions);
    const hasValidTotal = totalQuestions > 0;
    const accuracyText = hasValidTotal ? formatPercentValue(accuracyPercent) : '—';
    const scoreText = `${scoreValue}/${totalQuestions}`;

    return {
        position: index + 1,
        playerName,
        scoreValue,
        totalQuestions,
        scoreText,
        scoreDisplay: hasValidTotal ? `${scoreText} (${accuracyText})` : scoreText,
        accuracyPercent,
        accuracyText,
        formattedDate: formatter.format(createdAt)
    };
}

function extractDate(source) {
    if (!source) return new Date();
    if (source instanceof Date) return source;
    if (typeof source.toDate === 'function') {
        try {
            const parsed = source.toDate();
            if (parsed instanceof Date && !Number.isNaN(parsed.getTime())) {
                return parsed;
            }
        } catch (_) {
            // ignore and fallback
        }
    }
    const parsedDate = new Date(source);
    return Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
}

/**
 * Calculates the progress percentage for the quiz progress bar.
 * @param {number} answered Index of the current question (zero-based).
 * @param {number} total Total number of questions in the quiz.
 */
export function calculateProgressPercentage(answered, total) {
    if (!Number.isFinite(answered) || !Number.isFinite(total) || total <= 0) {
        return 0;
    }
    const clampedAnswered = Math.min(Math.max(answered, 0), total);
    const percent = (clampedAnswered / total) * 100;
    return Number(percent.toFixed(2));
}

export function calculateLeaderboardAccuracy(entry) {
    if (!entry || typeof entry !== 'object') return 0;
    const score = toNonNegativeNumber(entry.score);
    const total = toNonNegativeNumber(entry.total_questions_in_quiz);
    if (total <= 0) return 0;
    const ratio = score / total;
    if (!Number.isFinite(ratio)) return 0;
    return Math.max(0, Math.min(1, ratio));
}

export function sortLeaderboardEntries(entries = []) {
    if (!Array.isArray(entries)) return [];

    return entries
        .map(item => ({
            entry: item,
            accuracy: calculateLeaderboardAccuracy(item),
            score: toNonNegativeNumber(item?.score),
            createdAt: extractDate(item?.created_at)
        }))
        .sort((a, b) => {
            if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
            if (b.score !== a.score) return b.score - a.score;
            return a.createdAt.getTime() - b.createdAt.getTime();
        })
        .map(({ entry }) => entry);
}

export default {
    getStreakNotification,
    formatLeaderboardEntry,
    calculateProgressPercentage,
    calculateLeaderboardAccuracy,
    sortLeaderboardEntries
};
