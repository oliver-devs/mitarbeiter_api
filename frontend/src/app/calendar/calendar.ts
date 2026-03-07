import { Component, inject, signal, computed } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { rxResource } from '@angular/core/rxjs-interop';
import { EmployeeService } from '../shared/employee.service';
import { AbsenceService } from '../shared/absence.service';
import { Absence } from '../shared/models';
import { AuthService } from '../auth/auth.service';
import { AbsenceFormComponent, AbsenceFormData } from './absence-form';
import { formatLocalDate, getIsoWeek } from '../shared/date-utils';

interface CalendarDay {
    date: Date;
    dayOfMonth: number;
    isCurrentMonth: boolean;
    isToday: boolean;
}

interface CalendarWeek {
    kw: number;
    days: CalendarDay[];
}

const TYPE_COLORS: Record<string, { bg: string; label: string }> = {
    vacation: { bg: '#1565c0', label: 'Urlaub' },
    sick: { bg: '#d32f2f', label: 'Krank' },
    homeoffice: { bg: '#4caf50', label: 'Homeoffice' },
    other: { bg: '#ff9800', label: 'Sonstiges' },
};

const STATUS_LABELS: Record<string, string> = {
    pending: 'Ausstehend',
    approved: 'Genehmigt',
    denied: 'Abgelehnt',
};

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

const MONTH_NAMES = [
    'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
];

@Component({
    selector: 'app-calendar',
    imports: [MatCardModule, MatButtonModule, MatIconModule, MatTooltipModule, MatProgressSpinnerModule],
    templateUrl: './calendar.html',
    styleUrl: './calendar.css',
})
export class CalendarComponent {
    private readonly employeeService = inject(EmployeeService);
    private readonly absenceService = inject(AbsenceService);
    private readonly authService = inject(AuthService);
    private readonly dialog = inject(MatDialog);

    readonly currentMonth = signal(new Date().getMonth());
    readonly currentYear = signal(new Date().getFullYear());

    private readonly absenceResource = rxResource({
        stream: () => this.absenceService.getAbsences(),
    });

    private readonly employeeResource = rxResource({
        stream: () => this.employeeService.getEmployees(),
    });

    private readonly userResource = rxResource({
        stream: () => this.authService.getCurrentUser(),
    });

    readonly absences = computed(() => this.absenceResource.value() ?? []);
    readonly employees = computed(() => this.employeeResource.value() ?? []);
    readonly canApprove = computed(() => this.userResource.value()?.can_approve ?? false);
    readonly pendingCount = computed(() => this.absences().filter((a) => a.status === 'pending').length);

    readonly isLoading = computed(() => this.absenceResource.isLoading() || this.employeeResource.isLoading());
    readonly hasError = computed(() => this.absenceResource.error() || this.employeeResource.error());

    readonly weekdays = WEEKDAYS;
    readonly typeLegend = Object.entries(TYPE_COLORS).map(([type, { bg, label }]) => ({
        type,
        color: bg,
        label,
    }));

    readonly statusLegend: { status: string; label: string }[] = [
        { status: 'pending', label: 'Ausstehend' },
        { status: 'approved', label: 'Genehmigt' },
        { status: 'denied', label: 'Abgelehnt' },
    ];

    readonly monthName = computed(() => MONTH_NAMES[this.currentMonth()]);

    readonly calendarDays = computed<CalendarDay[]>(() => {
        const year = this.currentYear();
        const month = this.currentMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        const startOffset = (firstDay.getDay() + 6) % 7;
        const days: CalendarDay[] = [];
        const today = new Date();

        for (let i = startOffset - 1; i >= 0; i--) {
            const date = new Date(year, month, -i);
            days.push({ date, dayOfMonth: date.getDate(), isCurrentMonth: false, isToday: false });
        }

        for (let d = 1; d <= lastDay.getDate(); d++) {
            const date = new Date(year, month, d);
            days.push({
                date,
                dayOfMonth: d,
                isCurrentMonth: true,
                isToday:
                    d === today.getDate() &&
                    month === today.getMonth() &&
                    year === today.getFullYear(),
            });
        }

        const remaining = 7 - (days.length % 7);
        if (remaining < 7) {
            for (let i = 1; i <= remaining; i++) {
                const date = new Date(year, month + 1, i);
                days.push({ date, dayOfMonth: i, isCurrentMonth: false, isToday: false });
            }
        }

        return days;
    });

    readonly calendarWeeks = computed<CalendarWeek[]>(() => {
        const days = this.calendarDays();
        const weeks: CalendarWeek[] = [];
        for (let i = 0; i < days.length; i += 7) {
            const weekDays = days.slice(i, i + 7);
            weeks.push({ kw: getIsoWeek(weekDays[0].date), days: weekDays });
        }
        return weeks;
    });

    readonly absencesByDate = computed(() => {
        const map = new Map<string, Absence[]>();
        for (const absence of this.absences()) {
            const start = new Date(absence.start_date + 'T00:00:00');
            const end = new Date(absence.end_date + 'T00:00:00');
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const key = formatLocalDate(d);
                const list = map.get(key);
                if (list) {
                    list.push(absence);
                } else {
                    map.set(key, [absence]);
                }
            }
        }
        return map;
    });

    prevMonth() {
        if (this.currentMonth() === 0) {
            this.currentMonth.set(11);
            this.currentYear.update((y) => y - 1);
        } else {
            this.currentMonth.update((m) => m - 1);
        }
    }

    nextMonth() {
        if (this.currentMonth() === 11) {
            this.currentMonth.set(0);
            this.currentYear.update((y) => y + 1);
        } else {
            this.currentMonth.update((m) => m + 1);
        }
    }

    goToToday() {
        const now = new Date();
        this.currentMonth.set(now.getMonth());
        this.currentYear.set(now.getFullYear());
    }

    getAbsencesForDay(date: Date): Absence[] {
        return this.absencesByDate().get(formatLocalDate(date)) ?? [];
    }

    getColor(type: string): string {
        return TYPE_COLORS[type]?.bg ?? '#999';
    }

    getLabel(type: string): string {
        return TYPE_COLORS[type]?.label ?? type;
    }

    getStatusLabel(status?: string): string {
        return STATUS_LABELS[status ?? 'pending'] ?? status ?? '';
    }

    getTooltip(abs: Absence): string {
        return `${abs.employee_name} – ${this.getLabel(abs.absence_type)} (${this.getStatusLabel(abs.status)})`;
    }

    openForm(absence?: Absence) {
        const data: AbsenceFormData = {
            absence,
            employees: this.employees(),
            canApprove: this.canApprove(),
            currentUserEmail: this.userResource.value()?.email,
        };

        this.dialog
            .open(AbsenceFormComponent, { data, width: '500px' })
            .afterClosed()
            .subscribe((result) => {
                if (result) this.reload();
            });
    }

    reload() {
        this.absenceResource.reload();
        this.employeeResource.reload();
    }
}
