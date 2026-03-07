import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface CurrentUser {
    username: string;
    email: string;
    is_staff?: boolean;
    can_approve?: boolean;
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
    private readonly apiUrl = environment.apiUrl;

    readonly isLoggedIn = signal<boolean>(!!localStorage.getItem('token'));

    login(username: string, password: string) {
        return this.http.post<{ token: string }>(`${this.apiUrl}login/`, { username, password }).pipe(
            tap((response) => {
                localStorage.setItem('token', response.token);
                this.isLoggedIn.set(true);
            }),
        );
    }

    logout() {
        localStorage.removeItem('token');
        this.isLoggedIn.set(false);
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
}
