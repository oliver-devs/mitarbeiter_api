import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AbsenceService } from '../shared/absence.service';
import { Employee, Absence } from '../shared/models';
import { formatLocalDate, ABSENCE_STATUS_LABELS } from '../shared/date-utils';

export interface AbsenceFormData {
    absence?: Absence;
    employees: Employee[];
    canApprove?: boolean;
    currentUserEmail?: string;
}

@Component({
    selector: 'app-absence-form',
    imports: [
        FormsModule,
        MatDialogModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatButtonModule,
        MatDatepickerModule,
    ],
    templateUrl: './absence-form.html',
    styleUrl: './absence-form.css',
})
export class AbsenceFormComponent {
    private readonly service = inject(AbsenceService);
    private readonly ref = inject(MatDialogRef<AbsenceFormComponent>);
    private readonly data = inject<AbsenceFormData>(MAT_DIALOG_DATA);
    private readonly snackBar = inject(MatSnackBar);

    readonly isEditMode: boolean;
    readonly canApprove: boolean;
    readonly isOwnAbsence: boolean;

    readonly employees: Employee[];

    absence: Partial<Absence> = {
        employee: undefined,
        absence_type: 'vacation',
        note: '',
        status: 'pending',
    };

    startDate: Date | null = null;
    endDate: Date | null = null;

    constructor() {
        this.employees = this.data.employees;
        this.canApprove = this.data.canApprove ?? false;

        if (this.data.absence) {
            this.absence = { ...this.data.absence };
            this.startDate = new Date(this.data.absence.start_date + 'T00:00:00');
            this.endDate = new Date(this.data.absence.end_date + 'T00:00:00');
            this.isEditMode = true;

            const absenceEmployee = this.employees.find(e => e.id === this.data.absence!.employee);
            this.isOwnAbsence = absenceEmployee?.email === this.data.currentUserEmail;
        } else {
            this.isEditMode = false;
            this.isOwnAbsence = false;
        }

        this.showApprovalActions = this.canApprove && !this.isOwnAbsence && this.absence.status === 'pending';
    }

    readonly showApprovalActions: boolean;

    getStatusLabel(): string {
        return ABSENCE_STATUS_LABELS[this.absence.status ?? 'pending'] ?? '';
    }

    approve() {
        this.service.approveAbsence(this.absence.id!).subscribe({
            next: () => {
                this.snackBar.open('Abwesenheit genehmigt.', 'OK', { duration: 3000 });
                this.ref.close(true);
            },
            error: (err) => {
                const msg = err.error?.detail ?? 'Genehmigung fehlgeschlagen.';
                this.snackBar.open(msg, 'OK', { duration: 4000 });
            },
        });
    }

    deny() {
        this.service.denyAbsence(this.absence.id!).subscribe({
            next: () => {
                this.snackBar.open('Abwesenheit abgelehnt.', 'OK', { duration: 3000 });
                this.ref.close(true);
            },
            error: (err) => {
                const msg = err.error?.detail ?? 'Ablehnung fehlgeschlagen.';
                this.snackBar.open(msg, 'OK', { duration: 4000 });
            },
        });
    }

    save() {
        const payload: Absence = {
            ...this.absence,
            start_date: formatLocalDate(this.startDate!),
            end_date: formatLocalDate(this.endDate!),
        } as Absence;

        const request = this.isEditMode
            ? this.service.updateAbsence(payload.id!, payload)
            : this.service.createAbsence(payload);

        request.subscribe({
            next: () => this.ref.close(true),
            error: (err) => {
                const msg = err.error?.detail ?? 'Aktion fehlgeschlagen.';
                this.snackBar.open(msg, 'OK', { duration: 4000 });
            },
        });
    }

    delete() {
        this.service.deleteAbsence(this.absence.id!).subscribe({
            next: () => this.ref.close(true),
            error: (err) => {
                const msg = err.error?.detail ?? 'Löschen fehlgeschlagen.';
                this.snackBar.open(msg, 'OK', { duration: 4000 });
            },
        });
    }
}
