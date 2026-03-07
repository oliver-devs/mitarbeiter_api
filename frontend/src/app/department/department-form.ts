import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
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
    private readonly data = inject<Department>(MAT_DIALOG_DATA, { optional: true });

    readonly isEditMode = signal(false);
    dept: Department = { name: '', description: '' };

    constructor() {
        if (this.data) {
            this.dept = { ...this.data };
            this.isEditMode.set(true);
        }
    }

    save() {
        if (this.isEditMode()) {
            this.service.updateDepartment(this.dept.id!, this.dept).subscribe(() => {
                this.ref.close(true);
            });
        } else {
            this.service.createDepartment(this.dept).subscribe(() => {
                this.ref.close(true);
            });
        }
    }
}
