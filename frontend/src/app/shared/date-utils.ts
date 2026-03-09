import { TimeBreak } from './models';

// --- Datums-Utilities ---

/** Formatiert ein Date-Objekt als 'YYYY-MM-DD' (lokale Zeitzone). */
export function formatLocalDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

/** Berechnet die ISO-8601 Kalenderwoche für ein Datum. */
export function getIsoWeek(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}

/** Montag der aktuellen Woche (00:00:00). */
export function startOfWeek(date = new Date()): Date {
    const d = new Date(date);
    d.setDate(d.getDate() - (d.getDay() === 0 ? 6 : d.getDay() - 1));
    d.setHours(0, 0, 0, 0);
    return d;
}

// --- Zeit-Formatierung ---

const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 3_600_000;

/** Millisekunden als 'Xh Ym' formatieren. */
export function formatMs(ms: number): string {
    const h = Math.floor(ms / MS_PER_HOUR);
    const m = Math.floor((ms % MS_PER_HOUR) / MS_PER_MINUTE);
    return `${h}h ${m}m`;
}

/** ISO-Datumstring als Uhrzeit (HH:MM) formatieren. */
export function formatTime(dateStr?: string | null): string {
    return dateStr ? new Date(dateStr).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '-';
}

/** ISO-Datumstring als Kurzdatum (Mo, 01.03.) formatieren. */
export function formatShortDate(dateStr?: string): string {
    return dateStr ? new Date(dateStr).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' }) : '-';
}

/** ISO-Datumstring als volles Datum (Mo, 01.03.2026) formatieren. */
export function formatFullDate(dateStr?: string): string {
    return dateStr ? new Date(dateStr).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }) : '-';
}

// --- Pausen-Berechnung ---

/** Gesamte Pausenzeit in Millisekunden berechnen. */
export function calculateBreakMs(breaks?: TimeBreak[], now?: Date): number {
    if (!breaks) return 0;
    const nowMs = (now ?? new Date()).getTime();
    return breaks.reduce((sum, b) => {
        const end = b.end_time ? new Date(b.end_time).getTime() : nowMs;
        return sum + (end - new Date(b.start_time).getTime());
    }, 0);
}

// --- Status-Labels ---

export const ABSENCE_TYPE_LABELS: Record<string, string> = {
    vacation: 'Urlaub',
    sick: 'Krankheit',
    homeoffice: 'Homeoffice',
    meeting: 'Besprechung',
    other: 'Sonstiges',
};

export const ABSENCE_TYPE_COLORS: Record<string, string> = {
    vacation: '#4caf50',
    sick: '#f44336',
    homeoffice: '#2196f3',
    meeting: '#ff9800',
    other: '#9c27b0',
};

export const ABSENCE_STATUS_LABELS: Record<string, string> = {
    approved: 'Genehmigt',
    pending: 'Ausstehend',
    denied: 'Abgelehnt',
};

export const EMPLOYEE_STATUS_LABELS: Record<string, string> = {
    online: 'Im Dienst',
    busy: 'In Besprechung',
    homeoffice: 'Homeoffice',
    break: 'In Pause',
    sick: 'Krank gemeldet',
    vacation: 'Im Urlaub',
    absent: 'Abwesend',
    offline: 'Offline',
};

// --- Gesetzliche Arbeitszeit-Konstanten (ArbZG) ---

export const LEGAL = {
    /** Pflichtpause nach 6 Stunden (§4 ArbZG): 30 Minuten */
    BREAK_REQUIRED_AFTER_MS: 6 * MS_PER_HOUR,
    BREAK_WARNING_BEFORE_MS: 5.5 * MS_PER_HOUR,
    BREAK_MINIMUM_MS: 30 * MS_PER_MINUTE,

    /** Pflichtpause nach 9 Stunden (§4 ArbZG): 45 Minuten */
    EXTENDED_BREAK_AFTER_MS: 9 * MS_PER_HOUR,
    EXTENDED_BREAK_MINIMUM_MS: 45 * MS_PER_MINUTE,

    /** Maximale Arbeitszeit pro Tag (§3 ArbZG): 10 Stunden */
    MAX_WORK_MS: 10 * MS_PER_HOUR,
    MAX_WORK_WARNING_MS: 9.5 * MS_PER_HOUR,
};

// --- Generische Gruppierung ---

/** Gruppiert Items nach einem Key und sortiert alphabetisch. */
export function groupBy<T>(items: T[], keyFn: (item: T) => string): { name: string; items: T[] }[] {
    const groups = new Map<string, T[]>();
    for (const item of items) {
        const key = keyFn(item);
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(item);
    }
    return [...groups.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([name, items]) => ({ name, items }));
}

// --- Alphabetische Gruppierung ---

export interface AlphabetGroup<T> {
    letter: string;
    items: T[];
}

/** Gruppiert Items alphabetisch nach dem ersten Buchstaben eines Keys. */
export function groupAlphabetically<T>(items: T[], keyFn: (item: T) => string): AlphabetGroup<T>[] {
    const groups = new Map<string, T[]>();
    for (const item of items) {
        let letter = keyFn(item).charAt(0).toUpperCase();
        if (!/[A-Z]/.test(letter)) letter = '#';
        if (!groups.has(letter)) groups.set(letter, []);
        groups.get(letter)!.push(item);
    }
    return [...groups.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([letter, items]) => ({ letter, items }));
}

// --- Error-Handling ---

/** Extrahiert eine Fehlermeldung aus einem HTTP-Error-Response. */
export function extractErrorMessage(err: unknown, fallback: string): string {
    const e = err as { error?: { detail?: string; non_field_errors?: string[] } };
    return e?.error?.detail ?? e?.error?.non_field_errors?.[0] ?? fallback;
}
