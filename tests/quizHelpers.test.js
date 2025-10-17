import { describe, it, expect } from 'vitest';
import {
    getStreakNotification,
    formatLeaderboardEntry,
    calculateProgressPercentage
} from '../utils/quizHelpers.js';

describe('getStreakNotification', () => {
    it('devuelve null para valores no válidos', () => {
        expect(getStreakNotification(0)).toBeNull();
        expect(getStreakNotification(-3)).toBeNull();
        expect(getStreakNotification('3')).toBeNull();
    });

    it('devuelve configuración correcta para racha de 3', () => {
        const notification = getStreakNotification(3);
        expect(notification).toMatchObject({
            message: expect.stringContaining('3 respuestas correctas'),
            type: 'success'
        });
        expect(notification.duration).toBeGreaterThan(2000);
    });

    it('celebra cada múltiplo de 10', () => {
        const notification = getStreakNotification(20);
        expect(notification).not.toBeNull();
        expect(notification.message).toContain('20');
        expect(notification.type).toBe('success');
    });
});

describe('formatLeaderboardEntry', () => {
    it('normaliza nombre y puntaje', () => {
        const createdAt = { toDate: () => new Date('2024-03-20T00:00:00Z') };
        const formatted = formatLeaderboardEntry({
            player_name: '  Ana  ',
            score: 12,
            total_questions_in_quiz: 15,
            created_at: createdAt
        }, 0, 'es-CL');

        expect(formatted.position).toBe(1);
        expect(formatted.playerName).toBe('Ana');
        expect(formatted.scoreText).toBe('12/15');
        expect(formatted.formattedDate).toBeTypeOf('string');
        expect(formatted.formattedDate.length).toBeGreaterThan(3);
    });

    it('usa valores por defecto cuando faltan datos', () => {
        const formatted = formatLeaderboardEntry({}, 4, 'es-CL');
        expect(formatted.position).toBe(5);
        expect(formatted.playerName).toBe('Anónimo');
        expect(formatted.scoreText).toBe('0/0');
    });
});

describe('calculateProgressPercentage', () => {
    it('calcula porcentaje con precisión', () => {
        expect(calculateProgressPercentage(3, 15)).toBeCloseTo(20);
    });

    it('limita valores fuera de rango', () => {
        expect(calculateProgressPercentage(-2, 10)).toBe(0);
        expect(calculateProgressPercentage(15, 10)).toBe(100);
    });

    it('maneja entradas inválidas', () => {
        expect(calculateProgressPercentage('a', 10)).toBe(0);
        expect(calculateProgressPercentage(1, 0)).toBe(0);
    });
});
