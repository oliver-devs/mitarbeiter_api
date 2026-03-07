import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { EmployeeService } from '../shared/employee.service';
import { DepartmentService } from '../shared/department.service';
import { AbsenceService } from '../shared/absence.service';
import { Employee, Department } from '../shared/models';
import { AuthService, CurrentUser } from '../auth/auth.service';

@Component({
    selector: 'app-dashboard',
    imports: [MatCardModule, MatIconModule, MatButtonModule, RouterModule],
    templateUrl: './dashboard.html',
    styleUrl: './dashboard.css',
})
export class DashboardComponent implements OnInit {
    private readonly employeeService = inject(EmployeeService);
    private readonly departmentService = inject(DepartmentService);
    private readonly absenceService = inject(AbsenceService);
    private readonly authService = inject(AuthService);
    private readonly snackBar = inject(MatSnackBar);

    readonly totalEmployees = signal(0);
    readonly recentEmployees = signal<Employee[]>([]);
    readonly departments = signal<Department[]>([]);
    readonly currentUser = signal<CurrentUser | null>(null);
    readonly onVacationCount = signal(0);

    readonly formattedName = computed(() => {
        const user = this.currentUser();
        if (!user?.username) return 'Lade...';

        return user.username
            .split('.')
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ');
    });

    ngOnInit() {
        this.loadData();
    }

    private loadData() {
        this.authService.getCurrentUser().subscribe({
            next: (user) => this.currentUser.set(user),
            error: () => this.currentUser.set({ username: 'Gast', email: '' }),
        });

        this.employeeService.getEmployees().subscribe({
            next: (data) => {
                this.totalEmployees.set(data.length);
                this.recentEmployees.set([...data].reverse().slice(0, 5));
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
            next: (absences) => {
                const today = new Date().toISOString().slice(0, 10);
                const count = absences.filter(
                    (a) =>
                        a.absence_type === 'vacation' &&
                        a.status === 'approved' &&
                        a.start_date <= today &&
                        a.end_date >= today,
                ).length;
                this.onVacationCount.set(count);
            },
            error: () =>
                this.snackBar.open('Fehler beim Laden der Abwesenheiten.', 'OK', {
                    duration: 4000,
                }),
        });
    }
}
