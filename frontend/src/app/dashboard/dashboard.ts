import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { EmployeeService } from '../shared/employee.service';
import { DepartmentService } from '../shared/department.service';
import { AbsenceService } from '../shared/absence.service';
import { TimeService, TimeEntry } from '../shared/time.service';
import { Employee, Department, Absence } from '../shared/models';
import { AuthService } from '../auth/auth.service';

@Component({
    selector: 'app-dashboard',
    imports: [MatCardModule, MatIconModule, MatButtonModule, MatTooltipModule, RouterModule],
    templateUrl: './dashboard.html',
    styleUrl: './dashboard.css',
})
export class DashboardComponent implements OnInit, OnDestroy {
    private readonly employeeService = inject(EmployeeService);
    private readonly departmentService = inject(DepartmentService);
    private readonly absenceService = inject(AbsenceService);
    private readonly timeService = inject(TimeService);
    readonly auth = inject(AuthService);
    private readonly snackBar = inject(MatSnackBar);

    readonly totalEmployees = signal(0);
    readonly allEmployees = signal<Employee[]>([]);
    readonly departments = signal<Department[]>([]);
    readonly absences = signal<Absence[]>([]);
    readonly timeEntries = signal<TimeEntry[]>([]);

    private timerInterval: any;
    readonly currentTime = signal<Date>(new Date());
    readonly activeTimeEntry = computed(() => {
        return this.timeEntries().find(entry => !entry.end_time);
    });

    readonly completedEntries = computed(() => {
        return this.timeEntries()
            .filter(entry => !!entry.end_time)
            .slice(0, 5);
    });

    formatDuration(start: string, end: string | null | undefined): string {
        if (!end) return '-';
        const s = new Date(start).getTime();
        const e = new Date(end).getTime();
        const diffMs = e - s;
        if (diffMs < 0) return '00:00';

        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}h ${minutes}m`;
    }

    formatTime(dateStr: string | null | undefined): string {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    }

    readonly formattedName = computed(() => {
        const user = this.auth.currentUser();
        if (user?.first_name) return `${user.first_name} ${user.last_name}`;
        if (!user?.username) return 'Lade...';
        return user.username
            .split('.')
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ');
    });

    readonly subtitle = computed(() => {
        const user = this.auth.currentUser();
        const parts: string[] = [];
        if (user?.position_title) parts.push(user.position_title);
        if (user?.department_name) parts.push(user.department_name);
        return parts.join(' · ') || '';
    });

    readonly onVacationToday = computed(() => {
        const today = new Date().toISOString().slice(0, 10);
        return this.absences().filter(
            (a) =>
                a.absence_type === 'vacation' &&
                a.status === 'approved' &&
                a.start_date <= today &&
                a.end_date >= today,
        );
    });

    readonly absentToday = computed(() => {
        const today = new Date().toISOString().slice(0, 10);
        return this.absences().filter(
            (a) =>
                a.status === 'approved' &&
                a.start_date <= today &&
                a.end_date >= today,
        );
    });

    readonly pendingRequests = computed(() =>
        this.absences().filter((a) => a.status === 'pending'),
    );

    readonly maxDepartmentCount = computed(() => {
        const depts = this.departments();
        if (!depts || depts.length === 0) return 1;
        return Math.max(...depts.map(d => d.employee_count || 0));
    });

    readonly myDepartmentEmployees = computed(() => {
        const deptId = this.auth.currentUser()?.department_id;
        if (!deptId) return [];
        return this.allEmployees().filter((e) => e.department === deptId);
    });

    readonly myDepartmentAbsent = computed(() => {
        const deptId = this.auth.currentUser()?.department_id;
        if (!deptId) return [];
        const today = new Date().toISOString().slice(0, 10);
        const deptEmployeeIds = new Set(this.myDepartmentEmployees().map((e) => e.id));
        return this.absences().filter(
            (a) =>
                deptEmployeeIds.has(a.employee) &&
                a.status === 'approved' &&
                a.start_date <= today &&
                a.end_date >= today,
        );
    });

    readonly recentEmployees = computed(() =>
        [...this.allEmployees()].reverse().slice(0, 5),
    );

    readonly workedTodayStr = computed(() => {
        const entry = this.activeTimeEntry();
        if (!entry) return '00:00:00';

        const start = new Date(entry.start_time).getTime();
        const now = this.currentTime().getTime();
        const diffMs = now - start;
        
        if (diffMs < 0) return '00:00:00';

        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    });

    ngOnInit() {
        this.loadData();
        this.timerInterval = setInterval(() => {
            this.currentTime.set(new Date());
        }, 1000);
    }

    ngOnDestroy() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
    }

    private loadData() {
        this.employeeService.getEmployees().subscribe({
            next: (data) => {
                this.allEmployees.set(data);
                this.totalEmployees.set(data.length);
            },
            error: () =>
                this.snackBar.open('Fehler beim Laden der Mitarbeiter.', 'OK', { duration: 4000 }),
        });

        this.departmentService.getDepartments().subscribe({
            next: (data) => this.departments.set(data),
            error: () =>
                this.snackBar.open('Fehler beim Laden der Abteilungen.', 'OK', { duration: 4000 }),
        });

        this.absenceService.getAbsences().subscribe({
            next: (data) => this.absences.set(data),
            error: () =>
                this.snackBar.open('Fehler beim Laden der Abwesenheiten.', 'OK', { duration: 4000 }),
        });

        this.loadTimeEntries();
    }

    private loadTimeEntries() {
        const empId = this.auth.currentUser()?.employee_id;
        if (empId) {
            this.timeService.getEntriesForEmployee(empId).subscribe({
                next: (data) => this.timeEntries.set(data),
                error: () => console.error('Fehler beim Laden der Zeiteinträge'),
            });
        }
    }

    punchIn() {
        this.timeService.punchIn().subscribe({
            next: () => {
                this.loadTimeEntries();
                this.snackBar.open('Erfolgreich eingestempelt. Guten Start!', 'OK', { duration: 3000 });
            },
            error: (err) => {
                const msg = err.error?.detail || err.error?.non_field_errors?.[0] || 'Fehler beim Einstempeln';
                this.snackBar.open(msg, 'OK', { duration: 4000 });
            }
        });
    }

    punchOut() {
        this.timeService.punchOut().subscribe({
            next: () => {
                this.loadTimeEntries();
                this.snackBar.open('Erfolgreich ausgestempelt. Schönen Feierabend!', 'OK', { duration: 3000 });
            },
            error: (err) => {
                const msg = err.error?.detail || err.error?.non_field_errors?.[0] || 'Fehler beim Ausstempeln';
                this.snackBar.open(msg, 'OK', { duration: 4000 });
            }
        });
    }
}
