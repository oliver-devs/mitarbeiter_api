import { Component, DestroyRef, OnInit, inject, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatCardModule } from '@angular/material/card';
import { NgTemplateOutlet } from '@angular/common';

import { EmployeeService } from '../shared/employee.service';
import { Employee } from '../shared/models';
import { ConfirmDialogComponent } from '../shared/confirm-dialog';
import { AuthService } from '../auth/auth.service';
import { groupBy, groupAlphabetically } from '../shared/date-utils';

@Component({
    selector: 'app-employee-list',
    imports: [
        MatButtonModule,
        MatIconModule,
        RouterModule,
        MatFormFieldModule,
        MatInputModule,
        MatTooltipModule,
        MatButtonToggleModule,
        MatExpansionModule,
        MatCardModule,
        NgTemplateOutlet,
    ],
    templateUrl: './employee-list.html',
    styleUrl: './employee-list.css',
})
export class EmployeeListComponent implements OnInit {
    private readonly service = inject(EmployeeService);
    private readonly snackBar = inject(MatSnackBar);
    private readonly dialog = inject(MatDialog);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    readonly auth = inject(AuthService);
    private readonly destroyRef = inject(DestroyRef);

    readonly employees = signal<Employee[]>([]);
    readonly searchQuery = signal('');
    readonly currentView = signal<'department' | 'position'>('department');
    readonly selectedLetter = signal<string | null>(null);

    private readonly filteredEmployees = computed(() => {
        const query = this.searchQuery().toLowerCase().trim();
        const list = this.employees();
        if (!query) return list;

        return list.filter((emp) => {
            const first = (emp.first_name || '').toLowerCase();
            const last = (emp.last_name || '').toLowerCase();
            const email = (emp.email || '').toLowerCase();
            const dept = (emp.department_name || '').toLowerCase();
            const pos = (emp.position_title || '').toLowerCase();

            return (
                first.includes(query) ||
                last.includes(query) ||
                email.includes(query) ||
                dept.includes(query) ||
                pos.includes(query)
            );
        });
    });

    readonly departmentGroups = computed(() =>
        groupBy(this.filteredEmployees(), emp => emp.department_name || 'Ohne Abteilung'),
    );

    readonly alphabeticalDepartmentGroups = computed(() =>
        groupAlphabetically(this.departmentGroups(), g => g.name),
    );

    private readonly positionGroups = computed(() =>
        groupBy(this.filteredEmployees(), emp => emp.position_title || 'Ohne Position'),
    );

    readonly alphabeticalPositionGroups = computed(() =>
        groupAlphabetically(this.positionGroups(), g => g.name),
    );

    readonly availableLetters = computed(() => {
        const groups = this.currentView() === 'department'
            ? this.alphabeticalDepartmentGroups()
            : this.alphabeticalPositionGroups();
        return groups.map((g) => g.letter);
    });

    readonly filteredAlphabeticalDepartmentGroups = computed(() => {
        const groups = this.alphabeticalDepartmentGroups();
        const letter = this.selectedLetter();
        return letter ? groups.filter((g) => g.letter === letter) : groups;
    });

    readonly filteredAlphabeticalPositionGroups = computed(() => {
        const groups = this.alphabeticalPositionGroups();
        const letter = this.selectedLetter();
        return letter ? groups.filter((g) => g.letter === letter) : groups;
    });

    readonly totalFiltered = computed(() => this.filteredEmployees().length);

    ngOnInit() {
        this.loadEmployees();
        this.route.queryParams.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
            const view = params['view'];
            if (view === 'department' || view === 'position') {
                this.currentView.set(view);
            }
        });
    }

    setView(view: 'department' | 'position') {
        this.currentView.set(view);
        this.selectedLetter.set(null);
        this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { view },
            queryParamsHandling: 'merge',
        });
    }

    toggleLetter(letter: string) {
        this.selectedLetter.set(this.selectedLetter() === letter ? null : letter);
    }

    loadEmployees() {
        this.service.getAllEmployees().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: (data) => this.employees.set(data),
        });
    }

    deleteEmployee(id: number | undefined) {
        if (!id) return;

        const dialogRef = this.dialog.open(ConfirmDialogComponent, {
            width: '400px',
            data: {
                title: 'Mitarbeiter löschen?',
                message: 'Möchtest du diesen Mitarbeiter wirklich unwiderruflich entfernen?',
            },
        });

        dialogRef.afterClosed().subscribe((result) => {
            if (result === true) {
                this.service.deleteEmployee(id).subscribe({
                    next: () => {
                        this.loadEmployees();
                        this.snackBar.open('Gelöscht.', 'OK', { duration: 3000 });
                    },
                    error: () => this.snackBar.open('Fehler beim Löschen.', 'OK', { duration: 4000 }),
                });
            }
        });
    }

    applyFilter(event: Event) {
        const filterValue = (event.target as HTMLInputElement).value;
        this.searchQuery.set(filterValue);
    }

}
