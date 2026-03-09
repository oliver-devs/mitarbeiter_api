import { Component, DestroyRef, OnInit, inject, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { AbsenceService } from '../shared/absence.service';
import { EmployeeService } from '../shared/employee.service';
import { AuthService } from '../auth/auth.service';
import { Absence, Employee } from '../shared/models';
import { AbsenceFormComponent } from './absence-form';
import { DayDetailDialogComponent, DayDetailData } from './day-detail-dialog';
import {
    getIsoWeek, ABSENCE_TYPE_LABELS, ABSENCE_TYPE_COLORS, ABSENCE_STATUS_LABELS,
} from '../shared/date-utils';

@Component({
    selector: 'app-calendar',
    imports: [
        MatButtonToggleModule, MatCardModule, MatIconModule, MatButtonModule,
        MatTooltipModule, MatDialogModule, MatProgressSpinnerModule, MatDividerModule,
    ],
    templateUrl: './calendar.html',
    styleUrl: './calendar.css',
})
export class CalendarComponent implements OnInit {
    private readonly absenceService = inject(AbsenceService);
    private readonly employeeService = inject(EmployeeService);
    private readonly dialog = inject(MatDialog);
    readonly auth = inject(AuthService);
    private readonly destroyRef = inject(DestroyRef);

    readonly currentView = signal<'calendar' | 'list' | 'approvals'>('calendar');
    readonly currentDate = signal<Date>(new Date());
    readonly absences = signal<Absence[]>([]);
    readonly employees = signal<Employee[]>([]);
    readonly isLoading = signal(false);
    readonly hasError = signal(false);

    readonly weekdays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

    readonly typeLegend = Object.entries(ABSENCE_TYPE_LABELS).map(([type, label]) => ({
        type, label, color: ABSENCE_TYPE_COLORS[type] ?? '#9e9e9e',
    }));

    readonly statusLegend = Object.entries(ABSENCE_STATUS_LABELS).map(([status, label]) => ({
        status, label,
    }));

    readonly currentYear = computed(() => this.currentDate().getFullYear());
    readonly currentMonth = computed(() => this.currentDate().getMonth());

    readonly monthName = computed(() => {
        return this.currentDate().toLocaleString('de-DE', { month: 'long' });
    });

    readonly canApprove = computed(() => this.auth.canApprove());

    readonly myAbsences = computed(() => {
        const empId = this.auth.currentUser()?.employee_id;
        return this.absences().filter((a) => a.employee === empId);
    });

    readonly pendingAbsencesList = computed(() => {
        return this.absences().filter((a) => a.status === 'pending');
    });

    readonly pendingCount = computed(() => this.pendingAbsencesList().length);

    ngOnInit() {
        this.loadData();
    }

    reload() {
        this.loadData();
    }

    loadData() {
        this.isLoading.set(true);
        this.hasError.set(false);

        this.employeeService.getAllEmployees().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: (emps) => this.employees.set(emps),
            error: () => this.hasError.set(true),
        });

        this.absenceService.getAllAbsences().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: (data) => {
                this.absences.set(data);
                this.isLoading.set(false);
            },
            error: () => {
                this.hasError.set(true);
                this.isLoading.set(false);
            },
        });
    }

    setView(view: 'calendar' | 'list' | 'approvals') {
        this.currentView.set(view);
    }

    prevMonth() {
        const d = new Date(this.currentDate());
        d.setMonth(d.getMonth() - 1);
        this.currentDate.set(d);
    }

    nextMonth() {
        const d = new Date(this.currentDate());
        d.setMonth(d.getMonth() + 1);
        this.currentDate.set(d);
    }

    goToToday() {
        this.currentDate.set(new Date());
    }

    getColor(type: string): string {
        return ABSENCE_TYPE_COLORS[type] ?? '#9e9e9e';
    }

    getLabel(type: string): string {
        return ABSENCE_TYPE_LABELS[type] ?? type;
    }

    getStatusLabel(status?: string): string {
        return status ? (ABSENCE_STATUS_LABELS[status] ?? status) : '-';
    }

    getAbsencesForDay(date: Date): Absence[] {
        const dateStr = date.toISOString().slice(0, 10);
        return this.absences().filter((a) => a.start_date <= dateStr && a.end_date >= dateStr);
    }

    getAbsenceSummary(date: Date): { type: string, label: string, color: string, count: number }[] {
        const dailyAbsences = this.getAbsencesForDay(date);
        const summaryMap = new Map<string, number>();
        
        dailyAbsences.forEach(abs => {
            summaryMap.set(abs.absence_type, (summaryMap.get(abs.absence_type) || 0) + 1);
        });

        return Array.from(summaryMap.entries()).map(([type, count]) => ({
            type,
            count,
            label: this.getLabel(type),
            color: this.getColor(type)
        }));
    }

    getTooltip(abs: Absence): string {
        const status = this.getStatusLabel(abs.status || '');
        return `${abs.employee_name}: ${this.getLabel(abs.absence_type)} (${status})`;
    }

    calendarWeeks = computed(() => {
        const year = this.currentYear();
        const month = this.currentMonth();
        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);

        // Adjust to Monday
        const start = new Date(firstDayOfMonth);
        const startDay = start.getDay(); // 0 is Sunday
        const diff = startDay === 0 ? -6 : 1 - startDay;
        start.setDate(start.getDate() + diff);

        const end = new Date(lastDayOfMonth);
        const endDay = end.getDay();
        const endDiff = endDay === 0 ? 0 : 7 - endDay;
        end.setDate(end.getDate() + endDiff);

        const weeks: { kw: number; days: { date: Date; dayOfMonth: number; isCurrentMonth: boolean; isToday: boolean }[] }[] = [];
        let current = new Date(start);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        while (current <= end) {
            const days = [];
            const kw = getIsoWeek(current);
            for (let i = 0; i < 7; i++) {
                days.push({
                    date: new Date(current),
                    dayOfMonth: current.getDate(),
                    isCurrentMonth: current.getMonth() === month,
                    isToday: current.getTime() === today.getTime(),
                });
                current.setDate(current.getDate() + 1);
            }
            weeks.push({ kw, days });
        }
        return weeks;
    });

    openForm(absence?: Absence) {
        const dialogRef = this.dialog.open(AbsenceFormComponent, {
            width: '500px',
            data: {
                absence: absence ? { ...absence } : null,
                employees: this.employees(),
                canApprove: this.canApprove(),
                currentUserEmail: this.auth.currentUser()?.email,
            },
        });

        dialogRef.afterClosed().subscribe((result) => {
            if (result) {
                this.loadData();
            }
        });
    }

    openDayDetails(date: Date) {
        this.dialog.open(DayDetailDialogComponent, {
            width: '450px',
            data: {
                date: date,
                absences: this.getAbsencesForDay(date)
            }
        });
    }
}

