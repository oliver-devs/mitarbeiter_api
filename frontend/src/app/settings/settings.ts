import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { PositionService } from '../shared/position.service';
import { Position } from '../shared/models';
import { AuthService } from '../auth/auth.service';
import { PositionFormComponent } from './position-form';
import { ConfirmDialogComponent } from '../shared/confirm-dialog';

@Component({
    selector: 'app-settings',
    imports: [
        FormsModule,
        MatTabsModule,
        MatCardModule,
        MatIconModule,
        MatButtonModule,
        MatListModule,
        MatDialogModule,
        MatFormFieldModule,
        MatInputModule,
    ],
    templateUrl: './settings.html',
    styleUrl: './settings.css',
})
export class SettingsComponent implements OnInit {
    private readonly service = inject(PositionService);
    private readonly authService = inject(AuthService);
    private readonly dialog = inject(MatDialog);
    private readonly snackBar = inject(MatSnackBar);

    readonly positions = signal<Position[]>([]);

    companyData = {
        name: 'Meine Firma GmbH',
        vacationDays: 30,
        workingHours: 40,
    };

    passwordData = {
        old_password: '',
        new_password: '',
        confirm_password: '',
    };

    ngOnInit() {
        this.loadPositions();
    }

    saveCompanyData() {
        this.snackBar.open('Unternehmensdaten erfolgreich gespeichert!', 'OK', { duration: 3000 });
    }

    private loadPositions() {
        this.service.getPositions().subscribe({
            next: (data) => this.positions.set(data),
            error: (err) => console.error('Fehler beim Laden der Positionen:', err),
        });
    }

    openPositionForm(pos?: Position) {
        const ref = this.dialog.open(PositionFormComponent, {
            width: '400px',
            data: pos,
        });

        ref.afterClosed().subscribe((result) => {
            if (result === true) {
                this.loadPositions();
                this.snackBar.open(pos ? 'Position aktualisiert!' : 'Position erstellt!', 'OK', {
                    duration: 3000,
                });
            }
        });
    }

    removePosition(pos: Position) {
        const ref = this.dialog.open(ConfirmDialogComponent, {
            width: '400px',
            data: {
                title: 'Position löschen?',
                message: `Möchtest du die Position "${pos.title}" wirklich löschen?`,
            },
        });

        ref.afterClosed().subscribe((result) => {
            if (result === true) {
                this.service.deletePosition(pos.id).subscribe(() => {
                    this.loadPositions();
                    this.snackBar.open('Position gelöscht.', 'OK', { duration: 3000 });
                });
            }
        });
    }

    changePassword() {
        if (this.passwordData.new_password !== this.passwordData.confirm_password) {
            this.snackBar.open('Die neuen Passwörter stimmen nicht überein!', 'OK', {
                duration: 3000,
            });
            return;
        }

        this.authService
            .changePassword({
                old_password: this.passwordData.old_password,
                new_password: this.passwordData.new_password,
            })
            .subscribe({
                next: () => {
                    this.snackBar.open('Passwort erfolgreich geändert!', 'OK', { duration: 3000 });
                    this.passwordData = {
                        old_password: '',
                        new_password: '',
                        confirm_password: '',
                    };
                },
                error: (err) => {
                    console.error('Fehler beim Passwort ändern:', err);
                    this.snackBar.open('Fehler: Altes Passwort ist falsch.', 'OK', {
                        duration: 4000,
                    });
                },
            });
    }
}
