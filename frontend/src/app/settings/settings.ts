import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatListModule } from '@angular/material/list';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';

import { PositionService } from '../shared/position.service';
import { DepartmentService } from '../shared/department.service';
import { CompanyService, CompanyData } from '../shared/company.service';
import { Position, Department } from '../shared/models';
import { AuthService } from '../auth/auth.service';
import { ThemeService, MODE_OPTIONS, COLOR_THEMES } from '../shared/theme.service';
import { PositionFormComponent } from './position-form';
import { DepartmentFormComponent } from '../department/department-form';
import { ConfirmDialogComponent } from '../shared/confirm-dialog';

@Component({
    selector: 'app-settings',
    imports: [
        FormsModule,
        MatTabsModule,
        MatCardModule,
        MatIconModule,
        MatButtonModule,
        MatButtonToggleModule,
        MatListModule,
        MatDialogModule,
        MatFormFieldModule,
        MatInputModule,
        MatTooltipModule,
    ],
    templateUrl: './settings.html',
    styleUrl: './settings.css',
})
export class SettingsComponent implements OnInit {
    private readonly positionService = inject(PositionService);
    private readonly departmentService = inject(DepartmentService);
    private readonly companyService = inject(CompanyService);
    readonly auth = inject(AuthService);
    private readonly dialog = inject(MatDialog);
    private readonly snackBar = inject(MatSnackBar);

    readonly themeService = inject(ThemeService);
    readonly modeOptions = MODE_OPTIONS;
    readonly colorThemes = COLOR_THEMES;

    readonly personalView = signal<'profile' | 'appearance'>('profile');
    readonly departments = signal<Department[]>([]);
    readonly selectedDepartment = signal<Department | null>(null);
    readonly positions = signal<Position[]>([]);
    readonly selectedLetter = signal<string | null>(null);

    companyData: CompanyData = {
        name: '',
        softwareName: 'ClockIn',
        logoUrl: '',
        vacationDays: 30,
        workingHours: 40,
    };

    passwordData = {
        old_password: '',
        new_password: '',
        confirm_password: '',
    };

    // --- Computed for Alphabetical Filtering ---

    readonly availableLetters = computed(() => {
        const items = this.selectedDepartment() ? this.positions() : this.departments();
        const letters = new Set<string>();
        for (const item of items) {
            const name = this.selectedDepartment() ? (item as Position).title : (item as Department).name;
            let letter = name.charAt(0).toUpperCase();
            if (!/[A-Z]/.test(letter)) {
                letter = '#';
            }
            letters.add(letter);
        }
        return Array.from(letters).sort();
    });

    readonly filteredDepartments = computed(() => {
        const letter = this.selectedLetter();
        const depts = this.departments();
        if (!letter) return depts;
        
        return depts.filter(d => {
            let l = d.name.charAt(0).toUpperCase();
            if (!/[A-Z]/.test(l)) l = '#';
            return l === letter;
        });
    });

    readonly filteredPositions = computed(() => {
        const letter = this.selectedLetter();
        const pos = this.positions();
        if (!letter) return pos;
        
        return pos.filter(p => {
            let l = p.title.charAt(0).toUpperCase();
            if (!/[A-Z]/.test(l)) l = '#';
            return l === letter;
        });
    });

    ngOnInit() {
        this.loadDepartments();
        // Initialize local form state from global service
        this.companyData = { ...this.companyService.companyData() };
    }

    toggleLetter(letter: string) {
        if (this.selectedLetter() === letter) {
            this.selectedLetter.set(null);
        } else {
            this.selectedLetter.set(letter);
        }
    }

    saveCompanyData() {
        this.companyService.updateCompanyData(this.companyData);
        this.snackBar.open('Unternehmensdaten erfolgreich gespeichert!', 'OK', { duration: 3000 });
    }

    // --- Abteilungen ---

    private loadDepartments() {
        this.departmentService.getDepartments().subscribe({
            next: (data) => this.departments.set(data),
            error: (err) => console.error('Fehler beim Laden der Abteilungen:', err),
        });
    }

    openDepartmentForm(dept?: Department) {
        const ref = this.dialog.open(DepartmentFormComponent, {
            width: '400px',
            data: dept,
        });

        ref.afterClosed().subscribe((result) => {
            if (result === true) {
                this.loadDepartments();
                this.snackBar.open(dept ? 'Abteilung aktualisiert!' : 'Abteilung erstellt!', 'OK', {
                    duration: 3000,
                });
            }
        });
    }

    removeDepartment(dept: Department) {
        if (dept.employee_count && dept.employee_count > 0) {
            this.snackBar.open(`"${dept.name}" hat noch Mitarbeiter und kann nicht gelöscht werden.`, 'OK', {
                duration: 4000,
            });
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
                this.departmentService.deleteDepartment(dept.id!).subscribe(() => {
                    this.loadDepartments();
                    this.snackBar.open('Abteilung gelöscht.', 'OK', { duration: 3000 });
                });
            }
        });
    }

    // --- Positionen (Drill-Down) ---

    selectDepartment(dept: Department) {
        this.selectedDepartment.set(dept);
        this.selectedLetter.set(null);
        this.loadPositions(dept.id!);
    }

    backToDepartments() {
        this.selectedDepartment.set(null);
        this.selectedLetter.set(null);
        this.positions.set([]);
        this.loadDepartments();
    }

    private loadPositions(departmentId: number) {
        this.positionService.getPositions(departmentId).subscribe({
            next: (data) => this.positions.set(data),
            error: (err) => console.error('Fehler beim Laden der Positionen:', err),
        });
    }

    openPositionForm(pos?: Position) {
        const dept = this.selectedDepartment();
        if (!dept) return;

        const ref = this.dialog.open(PositionFormComponent, {
            width: '400px',
            data: pos ? pos : { department: dept.id },
        });

        ref.afterClosed().subscribe((result) => {
            if (result === true) {
                this.loadPositions(dept.id!);
                this.loadDepartments();
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
                this.positionService.deletePosition(pos.id).subscribe(() => {
                    const dept = this.selectedDepartment();
                    if (dept) this.loadPositions(dept.id!);
                    this.loadDepartments();
                    this.snackBar.open('Position gelöscht.', 'OK', { duration: 3000 });
                });
            }
        });
    }

    // --- Passwort ---

    changePassword() {
        if (this.passwordData.new_password !== this.passwordData.confirm_password) {
            this.snackBar.open('Die neuen Passwörter stimmen nicht überein!', 'OK', {
                duration: 3000,
            });
            return;
        }

        this.auth
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
