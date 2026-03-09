import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

export interface PasswordDialogData {
    username: string;
    password: string;
}

@Component({
    selector: 'app-password-dialog',
    imports: [MatDialogModule, MatButtonModule],
    template: `
        <h2 mat-dialog-title>Mitarbeiter angelegt</h2>

        <mat-dialog-content>
            <p>Bitte notiere die Zugangsdaten. Das Passwort wird nur einmalig angezeigt.</p>

            <div class="credentials">
                <div class="credential-row">
                    <span class="label">Benutzername</span>
                    <code>{{ data.username }}</code>
                </div>
                <div class="credential-row">
                    <span class="label">Initiales Passwort</span>
                    <code>{{ data.password }}</code>
                </div>
            </div>
        </mat-dialog-content>

        <mat-dialog-actions align="end">
            <button mat-flat-button color="primary" (click)="dialogRef.close()">
                Verstanden
            </button>
        </mat-dialog-actions>
    `,
    styles: `
        .credentials {
            background: var(--mat-sys-surface-container-low);
            border-radius: 8px;
            padding: 16px;
            margin-block: 16px;
        }

        .credential-row {
            display: flex;
            align-items: center;
            gap: 12px;

            &:not(:last-child) {
                margin-block-end: 10px;
            }
        }

        .label {
            color: var(--mat-sys-on-surface-variant);
            min-width: 160px;
            font-size: 0.9rem;
        }

        code {
            font-family: monospace;
            font-size: 1rem;
            background: var(--mat-sys-surface);
            border: 1px solid var(--mat-sys-outline-variant);
            border-radius: 4px;
            padding: 4px 10px;
            letter-spacing: 0.05em;
        }
    `,
})
export class PasswordDialogComponent {
    readonly dialogRef = inject(MatDialogRef<PasswordDialogComponent>);
    readonly data = inject<PasswordDialogData>(MAT_DIALOG_DATA);
}
