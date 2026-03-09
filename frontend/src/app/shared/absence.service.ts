import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Absence, PaginatedResponse } from './models';

@Injectable({
    providedIn: 'root',
})
export class AbsenceService {
    private readonly http = inject(HttpClient);
    private readonly apiUrl = environment.apiUrl;

    getAbsences(page = 1) {
        const params = new HttpParams().set('page', page);
        return this.http.get<PaginatedResponse<Absence>>(`${this.apiUrl}absences/`, { params });
    }

    getAllAbsences() {
        return this.http.get<Absence[]>(`${this.apiUrl}absences/`, {
            params: new HttpParams().set('page_size', '0'),
        });
    }

    createAbsence(absence: Absence) {
        return this.http.post<Absence>(`${this.apiUrl}absences/`, absence);
    }

    updateAbsence(id: number, absence: Absence) {
        return this.http.put<Absence>(`${this.apiUrl}absences/${id}/`, absence);
    }

    deleteAbsence(id: number) {
        return this.http.delete<void>(`${this.apiUrl}absences/${id}/`);
    }

    approveAbsence(id: number) {
        return this.http.post<Absence>(`${this.apiUrl}absences/${id}/approve/`, {});
    }

    denyAbsence(id: number) {
        return this.http.post<Absence>(`${this.apiUrl}absences/${id}/deny/`, {});
    }
}
