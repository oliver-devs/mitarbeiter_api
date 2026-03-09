import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { CompanyService } from '../shared/company.service';
import { ThemeService } from '../shared/theme.service';

@Component({
    selector: 'app-login',
    imports: [
        FormsModule,
        MatCardModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatIconModule,
    ],
    templateUrl: './login.html',
    styleUrl: './login.css',
})
export class LoginComponent implements OnInit {
    private readonly auth = inject(AuthService);
    private readonly router = inject(Router);
    private readonly snackBar = inject(MatSnackBar);
    private readonly destroyRef = inject(DestroyRef);
    readonly companyService = inject(CompanyService);
    readonly themeService = inject(ThemeService);

    username = '';
    password = '';
    readonly isLoading = signal(false);
    readonly currentYear = new Date().getFullYear();
    readonly currentTime = signal('');
    readonly currentDate = signal('');

    ngOnInit() {
        this.updateClock();
        const interval = setInterval(() => this.updateClock(), 1000);
        this.destroyRef.onDestroy(() => clearInterval(interval));
    }

    private updateClock() {
        const now = new Date();
        this.currentTime.set(now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        this.currentDate.set(now.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
    }

    toggleDarkMode() {
        this.themeService.setMode(this.themeService.isDarkMode() ? 'light' : 'dark');
    }

    onLogin() {
        if (this.isLoading()) return;

        this.isLoading.set(true);

        this.auth.login(this.username, this.password).subscribe({
            next: () => this.router.navigate(['/dashboard']),
            error: () => {
                this.isLoading.set(false);
                this.snackBar.open('Falsche Zugangsdaten!', 'OK', { duration: 3000 });
            },
        });
    }
}
