import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DepartmentService } from '../shared/department.service';
import { Department } from '../shared/models';

@Component({
    selector: 'app-department-form',
    imports: [FormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule],
    templateUrl: './department-form.html',
    styleUrl: './department-form.css',
})
export class DepartmentFormComponent {
    private readonly service = inject(DepartmentService);
    private readonly ref = inject(MatDialogRef<DepartmentFormComponent>);
    private readonly snackBar = inject(MatSnackBar);
    private readonly data = inject<Department>(MAT_DIALOG_DATA, { optional: true });

    readonly isEditMode = !!this.data;
    dept: Department = this.data ? { ...this.data } : { name: '', description: '' };

    save(): void {
        const request = this.isEditMode
            ? this.service.updateDepartment(this.dept.id!, this.dept)
            : this.service.createDepartment(this.dept);

        request.subscribe({
            next: () => this.ref.close(true),
            error: () => this.snackBar.open('Fehler beim Speichern der Abteilung.', 'OK', { duration: 4000 }),
        });
    }
}
