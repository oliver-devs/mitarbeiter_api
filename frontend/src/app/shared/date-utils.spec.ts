import {
    formatLocalDate, getIsoWeek, startOfWeek, formatMs, formatTime,
    formatShortDate, formatFullDate, calculateBreakMs, groupBy,
    groupAlphabetically, extractErrorMessage, LEGAL,
} from './date-utils';
import { TimeBreak } from './models';

describe('date-utils', () => {
    describe('formatLocalDate', () => {
        it('formats date as YYYY-MM-DD', () => {
            expect(formatLocalDate(new Date(2026, 2, 8))).toBe('2026-03-08');
        });

        it('pads single-digit months and days', () => {
            expect(formatLocalDate(new Date(2026, 0, 5))).toBe('2026-01-05');
        });
    });

    describe('getIsoWeek', () => {
        it('returns correct ISO week number', () => {
            // 2026-01-01 is Thursday → Week 1
            expect(getIsoWeek(new Date(2026, 0, 1))).toBe(1);
        });
    });

    describe('startOfWeek', () => {
        it('returns Monday at 00:00:00', () => {
            // 2026-03-08 is Sunday → Monday is 2026-03-02
            const result = startOfWeek(new Date(2026, 2, 8));
            expect(result.getDay()).toBe(1); // Monday
            expect(result.getHours()).toBe(0);
            expect(result.getMinutes()).toBe(0);
        });
    });

    describe('formatMs', () => {
        it('formats milliseconds as Xh Ym', () => {
            expect(formatMs(3_600_000)).toBe('1h 0m');
            expect(formatMs(5_400_000)).toBe('1h 30m');
            expect(formatMs(0)).toBe('0h 0m');
        });
    });

    describe('formatTime', () => {
        it('formats ISO string as HH:MM', () => {
            const result = formatTime('2026-03-08T14:30:00Z');
            expect(result).toMatch(/\d{2}:\d{2}/);
        });

        it('returns dash for null/undefined', () => {
            expect(formatTime(null)).toBe('-');
            expect(formatTime(undefined)).toBe('-');
        });
    });

    describe('calculateBreakMs', () => {
        it('returns 0 for undefined breaks', () => {
            expect(calculateBreakMs(undefined)).toBe(0);
        });

        it('returns 0 for empty breaks', () => {
            expect(calculateBreakMs([])).toBe(0);
        });

        it('calculates completed break duration', () => {
            const breaks: TimeBreak[] = [{
                id: 1,
                start_time: '2026-03-08T12:00:00Z',
                end_time: '2026-03-08T12:30:00Z',
            }];
            expect(calculateBreakMs(breaks)).toBe(30 * 60_000);
        });

        it('calculates open break with custom now', () => {
            const now = new Date('2026-03-08T12:15:00Z');
            const breaks: TimeBreak[] = [{
                id: 1,
                start_time: '2026-03-08T12:00:00Z',
                end_time: null,
            }];
            expect(calculateBreakMs(breaks, now)).toBe(15 * 60_000);
        });
    });

    describe('groupBy', () => {
        it('groups items by key and sorts alphabetically', () => {
            const items = [
                { dept: 'IT', name: 'A' },
                { dept: 'HR', name: 'B' },
                { dept: 'IT', name: 'C' },
            ];
            const result = groupBy(items, i => i.dept);
            expect(result.length).toBe(2);
            expect(result[0].name).toBe('HR');
            expect(result[0].items.length).toBe(1);
            expect(result[1].name).toBe('IT');
            expect(result[1].items.length).toBe(2);
        });
    });

    describe('groupAlphabetically', () => {
        it('groups items by first letter of key', () => {
            const items = [
                { name: 'Alpha' },
                { name: 'Beta' },
                { name: 'Aria' },
            ];
            const result = groupAlphabetically(items, i => i.name);
            expect(result.length).toBe(2);
            expect(result[0].letter).toBe('A');
            expect(result[0].items.length).toBe(2);
            expect(result[1].letter).toBe('B');
            expect(result[1].items.length).toBe(1);
        });

        it('groups non-alpha chars under #', () => {
            const items = [{ name: '123' }];
            const result = groupAlphabetically(items, i => i.name);
            expect(result[0].letter).toBe('#');
        });
    });

    describe('extractErrorMessage', () => {
        it('extracts detail from error', () => {
            const err = { error: { detail: 'Forbidden' } };
            expect(extractErrorMessage(err, 'fallback')).toBe('Forbidden');
        });

        it('extracts non_field_errors', () => {
            const err = { error: { non_field_errors: ['Invalid data'] } };
            expect(extractErrorMessage(err, 'fallback')).toBe('Invalid data');
        });

        it('returns fallback for unknown error', () => {
            expect(extractErrorMessage({}, 'fallback')).toBe('fallback');
            expect(extractErrorMessage(null, 'fallback')).toBe('fallback');
        });
    });

    describe('LEGAL constants', () => {
        it('has correct break threshold (6h)', () => {
            expect(LEGAL.BREAK_REQUIRED_AFTER_MS).toBe(6 * 3_600_000);
        });

        it('has correct max work time (10h)', () => {
            expect(LEGAL.MAX_WORK_MS).toBe(10 * 3_600_000);
        });

        it('has correct minimum break (30min)', () => {
            expect(LEGAL.BREAK_MINIMUM_MS).toBe(30 * 60_000);
        });
    });
});
