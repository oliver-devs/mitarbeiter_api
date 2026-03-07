import { Routes } from '@angular/router';
import { authGuard } from './auth/auth.guard';

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
        data: { title: 'Dashboard Übersicht' },
    },
    {
        path: 'analytics',
        loadComponent: () => import('./shared/placeholder').then((m) => m.PlaceholderComponent),
        canActivate: [authGuard],
        data: { title: 'Statistiken & Reports' },
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
        canActivate: [authGuard],
    },
    {
        path: 'edit/:id',
        loadComponent: () =>
            import('./employee/employee-form').then((m) => m.EmployeeFormComponent),
        canActivate: [authGuard],
    },
    {
        path: 'org-chart',
        loadComponent: () => import('./shared/placeholder').then((m) => m.PlaceholderComponent),
        canActivate: [authGuard],
        data: { title: 'Organigramm' },
    },
    {
        path: 'calendar',
        loadComponent: () => import('./calendar/calendar').then((m) => m.CalendarComponent),
        canActivate: [authGuard],
        data: { title: 'Urlaubsplaner & Kalender' },
    },
    {
        path: 'time-tracking',
        loadComponent: () => import('./shared/placeholder').then((m) => m.PlaceholderComponent),
        canActivate: [authGuard],
        data: { title: 'Zeiterfassung & Arbeitszeiten' },
    },
    {
        path: 'documents',
        loadComponent: () => import('./shared/placeholder').then((m) => m.PlaceholderComponent),
        canActivate: [authGuard],
        data: { title: 'Dokumentenverwaltung' },
    },
    {
        path: 'applicants',
        loadComponent: () => import('./shared/placeholder').then((m) => m.PlaceholderComponent),
        canActivate: [authGuard],
        data: { title: 'Bewerberverwaltung' },
    },
    {
        path: 'departments',
        loadComponent: () =>
            import('./department/department-list').then((m) => m.DepartmentListComponent),
        canActivate: [authGuard],
    },
    {
        path: 'settings',
        loadComponent: () => import('./settings/settings').then((m) => m.SettingsComponent),
        canActivate: [authGuard],
        data: { title: 'System Einstellungen' },
    },

    { path: '**', redirectTo: 'dashboard' },
];
