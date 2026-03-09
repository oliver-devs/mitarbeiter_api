import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

describe('AuthService', () => {
    let service: AuthService;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        localStorage.clear();
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                provideRouter([]),
            ],
        });
        service = TestBed.inject(AuthService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
        localStorage.clear();
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('isLoggedIn is false when no token', () => {
        expect(service.isLoggedIn()).toBe(false);
    });

    it('login stores token and sets isLoggedIn', () => {
        service.login('admin', 'pass').subscribe();

        const loginReq = httpMock.expectOne(`${environment.apiUrl}login/`);
        expect(loginReq.request.method).toBe('POST');
        expect(loginReq.request.body).toEqual({ username: 'admin', password: 'pass' });
        loginReq.flush({ token: 'test-token-123' });

        expect(localStorage.getItem('token')).toBe('test-token-123');
        expect(service.isLoggedIn()).toBe(true);

        // login triggers loadCurrentUser
        const meReq = httpMock.expectOne(`${environment.apiUrl}me/`);
        meReq.flush({ username: 'admin', email: 'a@b.de', is_management: false, can_approve: false });
    });

    it('logout clears token and user', () => {
        localStorage.setItem('token', 'some-token');
        service.isLoggedIn.set(true);

        service.logout();

        expect(localStorage.getItem('token')).toBeNull();
        expect(service.isLoggedIn()).toBe(false);
        expect(service.currentUser()).toBeNull();
    });

    it('getToken returns stored token', () => {
        localStorage.setItem('token', 'abc');
        expect(service.getToken()).toBe('abc');
    });

    it('changePassword posts to correct URL', () => {
        const data = { old_password: 'old', new_password: 'new' };
        service.changePassword(data).subscribe();
        const req = httpMock.expectOne(`${environment.apiUrl}change-password/`);
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual(data);
        req.flush({ detail: 'Password changed' });
    });

    it('isManagement reflects currentUser', () => {
        expect(service.isManagement()).toBe(false);
        service.currentUser.set({
            username: 'mgr', email: 'mgr@test.de',
            is_management: true, can_approve: true,
        });
        expect(service.isManagement()).toBe(true);
    });

    it('canApprove reflects currentUser', () => {
        expect(service.canApprove()).toBe(false);
        service.currentUser.set({
            username: 'approver', email: 'a@test.de',
            is_management: false, can_approve: true,
        });
        expect(service.canApprove()).toBe(true);
    });
});
