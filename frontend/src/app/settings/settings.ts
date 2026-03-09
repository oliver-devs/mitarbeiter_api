import { Component, DestroyRef, OnInit, inject, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
import { DepartmentStatsDialogComponent } from './department-stats-dialog';
import { groupAlphabetically } from '../shared/date-utils';

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
    private readonly destroyRef = inject(DestroyRef);

    readonly themeService = inject(ThemeService);
    readonly modeOptions = MODE_OPTIONS;
    readonly colorThemes = COLOR_THEMES;

    readonly personalView = signal<'profile' | 'appearance'>('profile');

    private static readonly GENDER_LABELS: Record<string, string> = {
        male: 'Männlich', female: 'Weiblich', diverse: 'Divers',
    };

    readonly profileData = computed(() => {
        const user = this.auth.currentUser();
        if (!user) return [];
        return [
            { icon: 'email', label: 'E-Mail', value: user.email },
            { icon: 'wc', label: 'Geschlecht', value: SettingsComponent.GENDER_LABELS[user.gender ?? ''] ?? '-' },
            { icon: 'domain', label: 'Abteilung', value: user.department_name ?? '-' },
            { icon: 'badge', label: 'Position', value: user.position_title ?? '-' },
            { icon: 'cake', label: 'Geburtstag', value: user.birthday ? this.formatDate(user.birthday) : '-' },
            { icon: 'calendar_today', label: 'Im Unternehmen seit', value: user.created_at ? this.formatDate(user.created_at) : '-' },
        ];
    });

    private formatDate(dateStr: string): string {
        return new Date(dateStr).toLocaleDateString('de-DE', {
            day: '2-digit', month: 'long', year: 'numeric',
        });
    }
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

    private readonly alphabeticalDepartments = computed(() =>
        groupAlphabetically(this.departments(), d => d.name),
    );

    private readonly alphabeticalPositions = computed(() =>
        groupAlphabetically(this.positions(), p => p.title),
    );

    readonly availableLetters = computed(() => {
        const groups = this.selectedDepartment() ? this.alphabeticalPositions() : this.alphabeticalDepartments();
        return groups.map(g => g.letter);
    });

    readonly filteredDepartments = computed(() => {
        const letter = this.selectedLetter();
        const groups = this.alphabeticalDepartments();
        if (!letter) return this.departments();
        return groups.find(g => g.letter === letter)?.items ?? [];
    });

    readonly filteredPositions = computed(() => {
        const letter = this.selectedLetter();
        const groups = this.alphabeticalPositions();
        if (!letter) return this.positions();
        return groups.find(g => g.letter === letter)?.items ?? [];
    });

    readonly maxDepartmentCount = computed(() => {
        const depts = this.departments();
        if (!depts || depts.length === 0) return 1;
        return Math.max(...depts.map((d) => d.employee_count || 0));
    });

    ngOnInit() {
        this.loadDepartments();
        // Initialize local form state from global service
        this.companyData = { ...this.companyService.companyData() };
    }

    toggleLetter(letter: string) {
        this.selectedLetter.set(this.selectedLetter() === letter ? null : letter);
    }

    saveCompanyData() {
        this.companyService.updateCompanyData(this.companyData);
        this.snackBar.open('Unternehmensdaten erfolgreich gespeichert!', 'OK', { duration: 3000 });
    }

    openStatsDialog() {
        this.dialog.open(DepartmentStatsDialogComponent, {
            width: '500px',
            data: { departments: this.departments() }
        });
    }

    // --- Abteilungen ---

    private loadDepartments() {
        this.departmentService.getDepartments().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: (data) => this.departments.set(data),
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
                this.departmentService.deleteDepartment(dept.id!).subscribe({
                    next: () => {
                        this.loadDepartments();
                        this.snackBar.open('Abteilung gelöscht.', 'OK', { duration: 3000 });
                    },
                    error: () => this.snackBar.open('Fehler beim Löschen der Abteilung.', 'OK', { duration: 4000 }),
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
        this.positionService.getPositions(departmentId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: (data) => this.positions.set(data),
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
                this.positionService.deletePosition(pos.id).subscribe({
                    next: () => {
                        const dept = this.selectedDepartment();
                        if (dept) this.loadPositions(dept.id!);
                        this.loadDepartments();
                        this.snackBar.open('Position gelöscht.', 'OK', { duration: 3000 });
                    },
                    error: () => this.snackBar.open('Fehler beim Löschen der Position.', 'OK', { duration: 4000 }),
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
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: () => {
                    this.snackBar.open('Passwort erfolgreich geändert!', 'OK', { duration: 3000 });
                    this.passwordData = {
                        old_password: '',
                        new_password: '',
                        confirm_password: '',
                    };
                },
                error: () => {
                    this.snackBar.open('Fehler: Altes Passwort ist falsch.', 'OK', {
                        duration: 4000,
                    });
                },
            });
    }
}
