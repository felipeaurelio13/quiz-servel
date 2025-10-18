import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
    getStreakNotification,
    formatLeaderboardEntry,
    calculateProgressPercentage,
    calculateLeaderboardAccuracy,
    sortLeaderboardEntries
} from '../utils/quizHelpers.js';

describe('getStreakNotification', () => {
    it('devuelve null para valores no válidos', () => {
        assert.equal(getStreakNotification(0), null);
        assert.equal(getStreakNotification(-3), null);
        assert.equal(getStreakNotification('3'), null);
    });

    it('devuelve configuración correcta para racha de 3', () => {
        const notification = getStreakNotification(3);
        assert.ok(notification, 'Debe existir notificación para racha de 3');
        assert.match(notification.message, /3 respuestas correctas/);
        assert.equal(notification.type, 'success');
        assert.ok(notification.duration > 2000);
    });

    it('celebra cada múltiplo de 10', () => {
        const notification = getStreakNotification(20);
        assert.ok(notification);
        assert.match(notification.message, /20/);
        assert.equal(notification.type, 'success');
    });
});

describe('formatLeaderboardEntry', () => {
    it('normaliza nombre, puntaje y precisión', () => {
        const createdAt = { toDate: () => new Date('2024-03-20T00:00:00Z') };
        const formatted = formatLeaderboardEntry({
            player_name: '  Ana  ',
            score: '12',
            total_questions_in_quiz: '15',
            created_at: createdAt
        }, 0, 'es-CL');

        assert.equal(formatted.position, 1);
        assert.equal(formatted.playerName, 'Ana');
        assert.equal(formatted.scoreText, '12/15');
        assert.equal(formatted.scoreDisplay, '12/15 (80%)');
        assert.equal(formatted.accuracyPercent, 80);
        assert.equal(formatted.accuracyText, '80%');
        assert.equal(typeof formatted.formattedDate, 'string');
        assert.ok(formatted.formattedDate.length > 3);
    });

    it('usa valores por defecto cuando faltan datos', () => {
        const formatted = formatLeaderboardEntry({}, 4, 'es-CL');
        assert.equal(formatted.position, 5);
        assert.equal(formatted.playerName, 'Anónimo');
        assert.equal(formatted.scoreText, '0/0');
        assert.equal(formatted.scoreDisplay, '0/0');
        assert.equal(formatted.accuracyPercent, 0);
        assert.equal(formatted.accuracyText, '—');
    });
});

describe('calculateLeaderboardAccuracy', () => {
    it('calcula precisión proporcional y la limita a 1', () => {
        const seventyPercent = calculateLeaderboardAccuracy({
            score: 7,
            total_questions_in_quiz: 10
        });
        assert.ok(Math.abs(seventyPercent - 0.7) < 1e-6);

        const perfectScore = calculateLeaderboardAccuracy({
            score: '5',
            total_questions_in_quiz: '5'
        });
        assert.equal(perfectScore, 1);

        const overMaxScore = calculateLeaderboardAccuracy({
            score: 12,
            total_questions_in_quiz: 3
        });
        assert.equal(overMaxScore, 1);

        assert.equal(calculateLeaderboardAccuracy({ score: 5, total_questions_in_quiz: 0 }), 0);
        assert.equal(calculateLeaderboardAccuracy(null), 0);
    });
});

describe('sortLeaderboardEntries', () => {
    it('ordena por precisión, luego por puntaje y finalmente por fecha', () => {
        const entries = [
            {
                player_name: 'Ana',
                score: 6,
                total_questions_in_quiz: 15,
                created_at: new Date('2024-03-21T00:00:00Z')
            },
            {
                player_name: 'Bruno',
                score: 8,
                total_questions_in_quiz: 10,
                created_at: new Date('2024-03-19T00:00:00Z')
            },
            {
                player_name: 'Carla',
                score: 8,
                total_questions_in_quiz: 10,
                created_at: new Date('2024-03-20T12:00:00Z')
            }
        ];

        const sorted = sortLeaderboardEntries(entries);
        assert.deepEqual(sorted.map(item => item.player_name), ['Bruno', 'Carla', 'Ana']);
    });
});

describe('calculateProgressPercentage', () => {
    it('calcula porcentaje con precisión', () => {
        const result = calculateProgressPercentage(3, 15);
        assert.ok(Math.abs(result - 20) < 1e-6);
    });

    it('limita valores fuera de rango', () => {
        assert.equal(calculateProgressPercentage(-2, 10), 0);
        assert.equal(calculateProgressPercentage(15, 10), 100);
    });

    it('maneja entradas inválidas', () => {
        assert.equal(calculateProgressPercentage('a', 10), 0);
        assert.equal(calculateProgressPercentage(1, 0), 0);
    });
});
