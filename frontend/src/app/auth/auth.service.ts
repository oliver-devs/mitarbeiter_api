import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { ThemeService } from '../shared/theme.service';

export interface CurrentUser {
    username: string;
    email: string;
    is_management: boolean;
    can_approve: boolean;
    employee_id?: number;
    first_name?: string;
    last_name?: string;
    gender?: 'male' | 'female' | 'diverse';
    birthday?: string;
    department_id?: number;
    department_name?: string;
    position_title?: string;
    current_status?: string;
    created_at?: string;
}

export interface ChangePasswordResponse {
    detail: string;
}

@Injectable({
    providedIn: 'root',
})
export class AuthService {
    private readonly http = inject(HttpClient);
    private readonly router = inject(Router);
    private readonly theme = inject(ThemeService);
    private readonly apiUrl = environment.apiUrl;

    readonly isLoggedIn = signal<boolean>(!!localStorage.getItem('token'));
    readonly currentUser = signal<CurrentUser | null>(null);
    readonly isManagement = computed(() => this.currentUser()?.is_management ?? false);
    readonly canApprove = computed(() => this.currentUser()?.can_approve ?? false);

    constructor() {
        if (this.isLoggedIn()) {
            this.loadCurrentUser();
        }
    }

    login(username: string, password: string) {
        return this.http.post<{ token: string }>(`${this.apiUrl}login/`, { username, password }).pipe(
            tap((response) => {
                localStorage.setItem('token', response.token);
                this.isLoggedIn.set(true);
                this.loadCurrentUser();
            }),
        );
    }

    logout() {
        localStorage.removeItem('token');
        this.isLoggedIn.set(false);
        this.currentUser.set(null);
        this.theme.resetToDefaults();
        this.router.navigate(['/login']);
    }

    getToken() {
        return localStorage.getItem('token');
    }

    getCurrentUser() {
        return this.http.get<CurrentUser>(`${this.apiUrl}me/`);
    }

    changePassword(data: { old_password: string; new_password: string }) {
        return this.http.post<ChangePasswordResponse>(`${this.apiUrl}change-password/`, data);
    }

    loadCurrentUser() {
        this.getCurrentUser().subscribe({
            next: (user) => {
                this.currentUser.set(user);
                this.theme.activateForUser(user.username, user.gender);
            },
            error: () => this.logout(),
        });
    }
}
