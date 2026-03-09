import { Component, DestroyRef, inject, signal, computed, OnInit, effect } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { EmployeeService } from '../shared/employee.service';
import { DepartmentService } from '../shared/department.service';
import { AbsenceService } from '../shared/absence.service';
import { TimeService } from '../shared/time.service';
import { TimeEntry, TimeBreak, Employee, Department, Absence } from '../shared/models';
import { AuthService } from '../auth/auth.service';
import { CompanyService } from '../shared/company.service';
import { EmployeeInfoDialogComponent } from '../shared/employee-info-dialog';
import { AbsenceFormComponent, AbsenceFormData } from '../calendar/absence-form';
import {
    formatMs, formatTime, formatShortDate, calculateBreakMs,
    startOfWeek, extractErrorMessage, EMPLOYEE_STATUS_LABELS, LEGAL,
} from '../shared/date-utils';

@Component({
    selector: 'app-dashboard',
    imports: [
        MatCardModule, MatIconModule, MatButtonModule,
        MatTooltipModule, RouterModule, MatDialogModule,
    ],
    templateUrl: './dashboard.html',
    styleUrl: './dashboard.css',
})
export class DashboardComponent implements OnInit {
    private readonly employeeService = inject(EmployeeService);
    private readonly departmentService = inject(DepartmentService);
    private readonly absenceService = inject(AbsenceService);
    private readonly timeService = inject(TimeService);
    readonly auth = inject(AuthService);
    readonly company = inject(CompanyService);
    private readonly snackBar = inject(MatSnackBar);
    private readonly dialog = inject(MatDialog);
    private readonly destroyRef = inject(DestroyRef);

    readonly totalEmployees = signal(0);
    readonly allEmployees = signal<Employee[]>([]);
    readonly departments = signal<Department[]>([]);
    readonly absences = signal<Absence[]>([]);
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

    readonly completedEntries = computed(() =>
        this.timeEntries().filter(e => !!e.end_time).slice(0, 5),
    );

    readonly weeklyWorkedMs = computed(() => {
        const weekStart = startOfWeek();
        const now = this.currentTime();
        return this.timeEntries()
            .filter(e => new Date(e.start_time) >= weekStart)
            .reduce((total, e) => {
                const end = e.end_time ? new Date(e.end_time) : now;
                return total + (end.getTime() - new Date(e.start_time).getTime()) - calculateBreakMs(e.breaks, now);
            }, 0);
    });

    readonly weeklyWorkedStr = computed(() => formatMs(Math.max(0, this.weeklyWorkedMs())));

    readonly weeklyProgressPercent = computed(() => {
        const targetHours = this.company.companyData().workingHours || 40;
        return Math.min((this.weeklyWorkedMs() / 3_600_000 / targetHours) * 100, 100);
    });

    readonly socialEvents = computed(() => {
        const today = new Date();
        const events: { name: string; type: 'birthday' | 'anniversary'; years?: number }[] = [];

        for (const emp of this.myDepartmentEmployees()) {
            const name = `${emp.first_name} ${emp.last_name}`;

            if (emp.birthday) {
                const bday = new Date(emp.birthday);
                if (bday.getMonth() === today.getMonth() && bday.getDate() === today.getDate()) {
                    events.push({ name, type: 'birthday' });
                }
            }
            if (emp.created_at) {
                const joined = new Date(emp.created_at);
                const years = today.getFullYear() - joined.getFullYear();
                if (years > 0 && joined.getMonth() === today.getMonth() && joined.getDate() === today.getDate()) {
                    events.push({ name, type: 'anniversary', years });
                }
            }
        }
        return events;
    });

    // --- Template-Hilfsmethoden (delegieren an shared Utilities) ---

    readonly formatTime = formatTime;
    readonly shortDateFormat = formatShortDate;
    readonly calculateBreakMs = calculateBreakMs;

    formatDuration(start: string, end?: string | null): string {
        if (!end) return '-';
        const ms = new Date(end).getTime() - new Date(start).getTime();
        return ms < 0 ? '00:00' : formatMs(ms);
    }

    getBreakDurationStr(breaks?: TimeBreak[]): string {
        const ms = calculateBreakMs(breaks);
        return ms === 0 ? '' : `${formatMs(ms)} Pause`;
    }

    readonly formattedName = computed(() => {
        const user = this.auth.currentUser();
        if (user?.first_name) return `${user.first_name} ${user.last_name}`;
        if (!user?.username) return 'Lade...';
        return user.username.split('.').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
    });

    readonly subtitle = computed(() => {
        const user = this.auth.currentUser();
        return [user?.position_title, user?.department_name].filter(Boolean).join(' · ');
    });

    private static readonly ABSENT_STATUSES = new Set(['offline', 'vacation', 'sick', 'absent']);

    readonly absentToday = computed(() =>
        this.myDepartmentEmployees().filter(e => DashboardComponent.ABSENT_STATUSES.has(e.current_status ?? '')),
    );

    readonly pendingRequests = computed(() =>
        this.absences().filter(a => a.status === 'pending'),
    );

    readonly maxDepartmentCount = computed(() => {
        const depts = this.departments();
        return depts.length === 0 ? 1 : Math.max(...depts.map(d => d.employee_count || 0));
    });

    readonly myDepartmentEmployees = computed(() => {
        const deptId = this.auth.currentUser()?.department_id;
        return deptId ? this.allEmployees().filter(e => e.department === deptId) : [];
    });

    readonly myDepartmentAbsent = computed(() => {
        const deptId = this.auth.currentUser()?.department_id;
        if (!deptId) return [];
        const today = new Date().toISOString().slice(0, 10);
        const deptEmployeeIds = new Set(this.myDepartmentEmployees().map(e => e.id));
        return this.absences().filter(a =>
            deptEmployeeIds.has(a.employee) && a.status === 'approved' &&
            a.start_date <= today && a.end_date >= today,
        );
    });

    readonly recentEmployees = computed(() => {
        if (this.auth.currentUser()?.department_name !== 'Personal') return [];
        return [...this.allEmployees()].reverse().slice(0, 5);
    });

    isNewEmployee(emp: Employee): boolean {
        if (!emp.created_at) return false;
        return new Date(emp.created_at).getTime() > Date.now() - 30 * 86_400_000;
    }

    readonly workedTodayStr = computed(() => {
        const entry = this.activeTimeEntry();
        if (!entry) return '00:00:00';

        const diffMs = this.currentTime().getTime() - new Date(entry.start_time).getTime()
            - calculateBreakMs(entry.breaks, this.currentTime());

        if (diffMs < 0) return '00:00:00';

        const h = Math.floor(diffMs / 3_600_000);
        const m = Math.floor((diffMs % 3_600_000) / 60_000);
        const s = Math.floor((diffMs % 60_000) / 1000);
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    });

    readonly legalAlerts = computed(() => {
        const entry = this.activeTimeEntry();
        if (!entry) return [];

        const rawMs = this.currentTime().getTime() - new Date(entry.start_time).getTime();
        const breakMs = calculateBreakMs(entry.breaks, this.currentTime());
        const netMs = rawMs - breakMs;
        const alerts: { type: 'warning' | 'error'; message: string }[] = [];

        if (rawMs > LEGAL.BREAK_REQUIRED_AFTER_MS && breakMs < LEGAL.BREAK_MINIMUM_MS) {
            alerts.push({ type: 'error', message: 'Rechtliche Pause von 30 Min. erforderlich (nach 6 Std. Arbeit).' });
        } else if (rawMs > LEGAL.BREAK_WARNING_BEFORE_MS && breakMs < LEGAL.BREAK_MINIMUM_MS) {
            alerts.push({ type: 'warning', message: 'In Kürze 30 Min. gesetzliche Pause erforderlich.' });
        }
        if (rawMs > LEGAL.EXTENDED_BREAK_AFTER_MS && breakMs < LEGAL.EXTENDED_BREAK_MINIMUM_MS) {
            alerts.push({ type: 'error', message: 'Rechtliche Pause von 45 Min. erforderlich (nach 9 Std. Arbeit).' });
        }
        if (netMs > LEGAL.MAX_WORK_MS) {
            alerts.push({ type: 'error', message: 'Maximale gesetzliche Arbeitszeit von 10 Stunden überschritten!' });
        } else if (netMs > LEGAL.MAX_WORK_WARNING_MS) {
            alerts.push({ type: 'warning', message: 'Maximale Arbeitszeit von 10 Stunden fast erreicht.' });
        }
        return alerts;
    });

    getStatusLabel(status?: string): string {
        return EMPLOYEE_STATUS_LABELS[status ?? ''] ?? 'Offline';
    }

    ngOnInit(): void {
        this.loadData();
    }

    private loadData() {
        this.employeeService.getAllEmployees().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: (data) => { this.allEmployees.set(data); this.totalEmployees.set(data.length); },
            error: () => this.snackBar.open('Fehler beim Laden der Mitarbeiter.', 'OK', { duration: 4000 }),
        });
        this.departmentService.getDepartments().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: (data) => this.departments.set(data),
            error: () => this.snackBar.open('Fehler beim Laden der Abteilungen.', 'OK', { duration: 4000 }),
        });
        this.absenceService.getAllAbsences().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: (data) => this.absences.set(data),
            error: () => this.snackBar.open('Fehler beim Laden der Abwesenheiten.', 'OK', { duration: 4000 }),
        });
        this.loadTimeEntries();
    }

    private loadTimeEntries() {
        const empId = this.auth.currentUser()?.employee_id;
        if (empId) {
            this.timeService.getAllEntriesForEmployee(empId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
                next: (data) => this.timeEntries.set(data),
            });
        }
    }

    punchIn() {
        this.timeService.punchIn().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: () => { this.loadData(); this.snackBar.open('Erfolgreich eingestempelt. Guten Start!', 'OK', { duration: 3000 }); },
            error: (err) => this.snackBar.open(extractErrorMessage(err, 'Fehler beim Einstempeln'), 'OK', { duration: 4000 }),
        });
    }

    punchOut() {
        this.timeService.punchOut().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: () => { this.loadData(); this.snackBar.open('Erfolgreich ausgestempelt. Schönen Feierabend!', 'OK', { duration: 3000 }); },
            error: (err) => this.snackBar.open(extractErrorMessage(err, 'Fehler beim Ausstempeln'), 'OK', { duration: 4000 }),
        });
    }

    startBreak() {
        this.timeService.startBreak().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: () => { this.loadData(); this.snackBar.open('Pause gestartet.', 'OK', { duration: 3000 }); },
            error: (err) => this.snackBar.open(extractErrorMessage(err, 'Fehler beim Starten der Pause'), 'OK', { duration: 4000 }),
        });
    }

    endBreak() {
        this.timeService.endBreak().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: () => { this.loadData(); this.snackBar.open('Pause beendet. Weiter geht\'s!', 'OK', { duration: 3000 }); },
            error: (err) => this.snackBar.open(extractErrorMessage(err, 'Fehler beim Beenden der Pause'), 'OK', { duration: 4000 }),
        });
    }

    openEmployeeInfo(emp: Employee) {
        this.dialog.open(EmployeeInfoDialogComponent, { width: '400px', data: emp, autoFocus: false });
    }

    requestAbsence() {
        this.dialog.open<AbsenceFormComponent, AbsenceFormData>(AbsenceFormComponent, {
            width: '500px',
            data: {
                employees: this.allEmployees(),
                canApprove: this.auth.canApprove(),
                currentUserEmail: this.auth.currentUser()?.email || '',
            },
        });
    }
}
