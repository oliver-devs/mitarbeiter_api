import { Routes } from '@angular/router';
import { authGuard } from './auth/auth.guard';
import { staffGuard } from './auth/staff.guard';

export const routes: Routes = [
    {
        path: 'login',
        loadComponent: () => import('./login/login').then((m) => m.LoginComponent),
    },
    { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

    {
        path: 'dashboard',
        loadComponent: () => import('./dashboard/dashboard').then((m) => m.DashboardComponent),
        canActivate: [authGuard],
    },
    {
        path: 'list',
        loadComponent: () =>
            import('./employee/employee-list').then((m) => m.EmployeeListComponent),
        canActivate: [authGuard],
    },
    {
        path: 'create',
        loadComponent: () =>
            import('./employee/employee-form').then((m) => m.EmployeeFormComponent),
        canActivate: [authGuard, staffGuard],
    },
    {
        path: 'edit/:id',
        loadComponent: () =>
            import('./employee/employee-form').then((m) => m.EmployeeFormComponent),
        canActivate: [authGuard, staffGuard],
    },
    {
        path: 'calendar',
        loadComponent: () => import('./calendar/calendar').then((m) => m.CalendarComponent),
        canActivate: [authGuard],
    },
    {
        path: 'time-tracking',
        loadComponent: () => import('./time-tracking/time-tracking').then((m) => m.TimeTrackingComponent),
        canActivate: [authGuard],
    },
    {
        path: 'settings',
        loadComponent: () => import('./settings/settings').then((m) => m.SettingsComponent),
        canActivate: [authGuard],
    },

    { path: 'departments', redirectTo: 'settings' },
    { path: '**', redirectTo: 'dashboard' },
];
