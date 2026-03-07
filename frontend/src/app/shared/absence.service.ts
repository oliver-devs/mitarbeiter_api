import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Absence } from './models';

@Injectable({
    providedIn: 'root',
})
export class AbsenceService {
    private readonly http = inject(HttpClient);
    private readonly apiUrl = environment.apiUrl;

    getAbsences() {
        return this.http.get<Absence[]>(`${this.apiUrl}absences/`);
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
