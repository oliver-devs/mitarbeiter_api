import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';

import { EmployeeService } from '../shared/employee.service';
import { Employee } from '../shared/models';
import { ConfirmDialogComponent } from '../shared/confirm-dialog';

@Component({
    selector: 'app-employee-list',
    imports: [
        MatTableModule,
        MatButtonModule,
        MatIconModule,
        RouterModule,
        MatFormFieldModule,
        MatInputModule,
        MatTooltipModule,
    ],
    templateUrl: './employee-list.html',
    styleUrl: './employee-list.css',
})
export class EmployeeListComponent implements OnInit {
    private readonly service = inject(EmployeeService);
    private readonly snackBar = inject(MatSnackBar);
    private readonly dialog = inject(MatDialog);

    readonly employees = signal<Employee[]>([]);
    readonly searchQuery = signal('');

    readonly filteredEmployees = computed(() => {
        const query = this.searchQuery().toLowerCase().trim();
        const list = this.employees();

        if (!query) return list;

        return list.filter((emp) => {
            const first = (emp.first_name || '').toLowerCase();
            const last = (emp.last_name || '').toLowerCase();
            const email = (emp.email || '').toLowerCase();
            const dept = String(emp.department || '').toLowerCase();
            const pos = String(emp.position || '').toLowerCase();

            return (
                first.includes(query) ||
                last.includes(query) ||
                email.includes(query) ||
                dept.includes(query) ||
                pos.includes(query)
            );
        });
    });

    readonly displayedColumns = ['status', 'name', 'email', 'department', 'position', 'actions'] as const;

    ngOnInit() {
        this.loadEmployees();
    }

    loadEmployees() {
        this.service.getEmployees().subscribe({
            next: (data) => this.employees.set(data),
            error: (err) => console.error(err),
        });
    }

    approveEmployee(emp: Employee) {
        if (!emp.id) return;

        this.service.updateEmployee(emp.id, { ...emp, is_approved: true }).subscribe(() => {
            this.snackBar.open(`${emp.first_name} wurde freigegeben!`, 'OK', { duration: 3000 });
            this.loadEmployees();
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
                this.service.deleteEmployee(id).subscribe(() => {
                    this.loadEmployees();
                    this.snackBar.open('Gelöscht.', 'OK', { duration: 3000 });
                });
            }
        });
    }

    applyFilter(event: Event) {
        const filterValue = (event.target as HTMLInputElement).value;
        this.searchQuery.set(filterValue);
    }
}
