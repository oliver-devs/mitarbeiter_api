import { Component, DestroyRef, inject, signal, computed, OnInit, effect } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTableModule } from '@angular/material/table';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TimeService } from '../shared/time.service';
import { TimeEntry, TimeBreak } from '../shared/models';
import { AuthService } from '../auth/auth.service';
import { CompanyService } from '../shared/company.service';
import {
    formatMs, formatTime, formatFullDate, calculateBreakMs,
    startOfWeek, extractErrorMessage,
} from '../shared/date-utils';

@Component({
    selector: 'app-time-tracking',
    imports: [
        MatCardModule, MatIconModule, MatButtonModule,
        MatTooltipModule, MatTableModule, MatSnackBarModule, MatDividerModule,
    ],
    templateUrl: './time-tracking.html',
    styleUrl: './time-tracking.css',
})
export class TimeTrackingComponent implements OnInit {
    private readonly timeService = inject(TimeService);
    readonly auth = inject(AuthService);
    readonly company = inject(CompanyService);
    private readonly snackBar = inject(MatSnackBar);
    private readonly destroyRef = inject(DestroyRef);

    readonly timeEntries = signal<TimeEntry[]>([]);
    readonly currentTime = signal<Date>(new Date());

    constructor() {
        effect((onCleanup) => {
            const id = setInterval(() => this.currentTime.set(new Date()), 1000);
            onCleanup(() => clearInterval(id));
        });
    }

    readonly activeTimeEntry = computed(() => this.timeEntries().find(e => !e.end_time));
    readonly activeBreak = computed(() => this.activeTimeEntry()?.breaks?.find(b => !b.end_time));

    readonly workedTodayMs = computed(() => {
        const entry = this.activeTimeEntry();
        if (!entry) return 0;
        const now = this.currentTime();
        const diffMs = now.getTime() - new Date(entry.start_time).getTime() - calculateBreakMs(entry.breaks, now);
        return Math.max(0, diffMs);
    });

    readonly monthlyWorkedMs = computed(() => {
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);
        return this.calculateTotalMsSince(monthStart);
    });

    readonly weeklyWorkedMs = computed(() => this.calculateTotalMsSince(startOfWeek()));

    // --- Template-Hilfsmethoden (delegieren an shared Utilities) ---

    readonly formatTime = formatTime;
    readonly formatDate = formatFullDate;
    readonly formatMs = formatMs;

    calculateBreakMinutes(breaks?: TimeBreak[]): number {
        return Math.floor(calculateBreakMs(breaks) / 60_000);
    }

    getEntryNetDurationMs(entry: TimeEntry): number {
        const now = this.currentTime();
        const end = entry.end_time ? new Date(entry.end_time).getTime() : now.getTime();
        return Math.max(0, end - new Date(entry.start_time).getTime() - calculateBreakMs(entry.breaks, now));
    }

    ngOnInit(): void {
        this.loadData();
    }

    loadData() {
        const empId = this.auth.currentUser()?.employee_id;
        if (empId) {
            this.timeService.getAllEntriesForEmployee(empId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
                next: (data) => this.timeEntries.set(data),
                error: () => this.snackBar.open('Fehler beim Laden der Zeiten.', 'OK', { duration: 4000 }),
            });
        }
    }

    punchIn() {
        this.timeService.punchIn().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: () => this.loadData(),
            error: (err) => this.snackBar.open(extractErrorMessage(err, 'Fehler beim Einstempeln'), 'OK', { duration: 4000 }),
        });
    }

    punchOut() {
        this.timeService.punchOut().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: () => this.loadData(),
            error: (err) => this.snackBar.open(extractErrorMessage(err, 'Fehler beim Ausstempeln'), 'OK', { duration: 4000 }),
        });
    }

    startBreak() {
        this.timeService.startBreak().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: () => this.loadData(),
            error: (err) => this.snackBar.open(extractErrorMessage(err, 'Fehler beim Starten der Pause'), 'OK', { duration: 4000 }),
        });
    }

    endBreak() {
        this.timeService.endBreak().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: () => this.loadData(),
            error: (err) => this.snackBar.open(extractErrorMessage(err, 'Fehler beim Beenden der Pause'), 'OK', { duration: 4000 }),
        });
    }

    private calculateTotalMsSince(since: Date): number {
        const now = this.currentTime();
        return this.timeEntries()
            .filter(e => new Date(e.start_time) >= since)
            .reduce((sum, e) => sum + this.getEntryNetDurationMs(e), 0);
    }
}
