import { Component, OnInit, inject, signal } from '@angular/core';
import { DepartmentService } from '../shared/department.service';
import { Department } from '../shared/models';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

import { ConfirmDialogComponent } from '../shared/confirm-dialog';
import { DepartmentFormComponent } from './department-form';

@Component({
    selector: 'app-department-list',
    imports: [MatCardModule, MatButtonModule, MatIconModule, MatDialogModule, MatTooltipModule],
    templateUrl: './department-list.html',
    styleUrl: './department-list.css',
})
export class DepartmentListComponent implements OnInit {
    private readonly service = inject(DepartmentService);
    private readonly dialog = inject(MatDialog);
    private readonly snackBar = inject(MatSnackBar);

    readonly departments = signal<Department[]>([]);

    ngOnInit() {
        this.load();
    }

    private load() {
        this.service.getDepartments().subscribe((data) => {
            this.departments.set(data);
        });
    }

    openForm(dept?: Department) {
        const ref = this.dialog.open(DepartmentFormComponent, {
            width: '400px',
            data: dept,
        });

        ref.afterClosed().subscribe((result) => {
            if (result === true) {
                this.load();
                this.snackBar.open(dept ? 'Gespeichert!' : 'Erstellt!', 'OK', { duration: 3000 });
            }
        });
    }

    deleteDept(dept: Department) {
        if (dept.employee_count && dept.employee_count > 0) {
            this.snackBar.open(`"${dept.name}" ist nicht leer!`, 'OK');
            return;
        }

        const ref = this.dialog.open(ConfirmDialogComponent, {
            width: '400px',
            data: {
                title: 'Abteilung löschen?',
                message: `Möchtest du die Abteilung "${dept.name}" wirklich löschen?`,
            },
        });

        ref.afterClosed().subscribe((result) => {
            if (result === true) {
                this.service.deleteDepartment(dept.id!).subscribe(() => {
                    this.load();
                    this.snackBar.open('Abteilung gelöscht.', 'OK', { duration: 3000 });
                });
            }
        });
    }
}
