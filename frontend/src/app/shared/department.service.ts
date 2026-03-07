import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Department } from './models';

@Injectable({
    providedIn: 'root',
})
export class DepartmentService {
    private readonly http = inject(HttpClient);
    private readonly apiUrl = environment.apiUrl;

    getDepartments() {
        return this.http.get<Department[]>(`${this.apiUrl}departments/`);
    }

    createDepartment(dept: Department) {
        return this.http.post<Department>(`${this.apiUrl}departments/`, dept);
    }

    updateDepartment(id: number, dept: Department) {
        return this.http.put<Department>(`${this.apiUrl}departments/${id}/`, dept);
    }

    deleteDepartment(id: number) {
        return this.http.delete<void>(`${this.apiUrl}departments/${id}/`);
    }
}
