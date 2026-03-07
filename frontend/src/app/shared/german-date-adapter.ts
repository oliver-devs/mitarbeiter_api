import { Injectable } from '@angular/core';
import { NativeDateAdapter } from '@angular/material/core';

/**
 * Custom DateAdapter für deutsche Datumsformate.
 *
 * Anzeige: TT.MM.JJJJ
 * Akzeptierte Eingaben: TT.MM.JJJJ, TT.MM.JJ, JJJJ-MM-TT
 */
@Injectable()
export class GermanDateAdapter extends NativeDateAdapter {
    override parse(value: string): Date | null {
        if (!value) return null;

        const trimmed = value.trim();

        // JJJJ-MM-TT (ISO)
        const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
        if (isoMatch) {
            return this.createValidDate(+isoMatch[1], +isoMatch[2], +isoMatch[3]);
        }

        // TT.MM.JJJJ oder TT.MM.JJ
        const deMatch = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/);
        if (deMatch) {
            let year = +deMatch[3];
            if (year < 100) {
                year += year < 50 ? 2000 : 1900;
            }
            return this.createValidDate(year, +deMatch[2], +deMatch[1]);
        }

        return null;
    }

    override format(date: Date, _displayFormat: Object): string {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}.${month}.${year}`;
    }

    private createValidDate(year: number, month: number, day: number): Date | null {
        const date = new Date(year, month - 1, day);

        // Prüfen ob das Datum gültig ist (z.B. 31.02 → ungültig)
        if (
            date.getFullYear() !== year ||
            date.getMonth() !== month - 1 ||
            date.getDate() !== day
        ) {
            return null;
        }

        return date;
    }
}
