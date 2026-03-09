import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Employee, CreateEmployeeResponse, PaginatedResponse } from './models';

@Injectable({
    providedIn: 'root',
})
export class EmployeeService {
    private readonly http = inject(HttpClient);
    private readonly apiUrl = environment.apiUrl;

    getEmployees(page = 1) {
        const params = new HttpParams().set('page', page);
        return this.http.get<PaginatedResponse<Employee>>(`${this.apiUrl}employees/`, { params });
    }

    getAllEmployees() {
        return this.http.get<Employee[]>(`${this.apiUrl}employees/`, {
            params: new HttpParams().set('page_size', '0'),
        });
    }

    getEmployee(id: number) {
        return this.http.get<Employee>(`${this.apiUrl}employees/${id}/`);
    }

    createEmployee(employee: Employee) {
        return this.http.post<CreateEmployeeResponse>(`${this.apiUrl}employees/`, employee);
    }

    updateEmployee(id: number, employee: Employee) {
        return this.http.put<Employee>(`${this.apiUrl}employees/${id}/`, employee);
    }

    deleteEmployee(id: number) {
        return this.http.delete<void>(`${this.apiUrl}employees/${id}/`);
    }
}
