import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PositionService } from '../shared/position.service';
import { Position } from '../shared/models';

@Component({
    selector: 'app-position-form',
    imports: [FormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatCheckboxModule],
    templateUrl: './position-form.html',
    styleUrl: './position-form.css',
})
export class PositionFormComponent {
    private readonly service = inject(PositionService);
    private readonly ref = inject(MatDialogRef<PositionFormComponent>);
    private readonly snackBar = inject(MatSnackBar);
    private readonly data = inject<Partial<Position>>(MAT_DIALOG_DATA, { optional: true });

    readonly isEditMode: boolean;
    pos: Partial<Position>;

    constructor() {
        if (this.data?.id) {
            this.pos = { ...this.data };
            this.isEditMode = true;
        } else {
            this.pos = {
                department: this.data?.department,
                title: '',
                is_management: false,
                can_approve: false,
                requires_dual_approval: false,
            };
            this.isEditMode = false;
        }
    }

    save() {
        const request = this.isEditMode
            ? this.service.updatePosition(this.pos.id!, this.pos)
            : this.service.createPosition(this.pos);

        request.subscribe({
            next: () => this.ref.close(true),
            error: () => {
                this.snackBar.open('Fehler beim Speichern der Position.', 'OK', { duration: 4000 });
            },
        });
    }
}
