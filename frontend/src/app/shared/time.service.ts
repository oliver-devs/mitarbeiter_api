import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { TimeEntry, TimeCorrectionRequest, PaginatedResponse } from './models';

@Injectable({ providedIn: 'root' })
export class TimeService {
    private readonly http = inject(HttpClient);
    private readonly apiUrl = `${environment.apiUrl}time-entries/`;

    getEntriesForEmployee(employeeId: number, page = 1): Observable<PaginatedResponse<TimeEntry>> {
        const params = new HttpParams().set('employee', employeeId).set('page', page);
        return this.http.get<PaginatedResponse<TimeEntry>>(this.apiUrl, { params });
    }

    getAllEntriesForEmployee(employeeId: number): Observable<TimeEntry[]> {
        const params = new HttpParams().set('employee', employeeId).set('page_size', '0');
        return this.http.get<TimeEntry[]>(this.apiUrl, { params });
    }

    punchIn(): Observable<TimeEntry> {
        return this.http.post<TimeEntry>(this.apiUrl, {});
    }

    punchOut(): Observable<TimeEntry> {
        return this.http.post<TimeEntry>(`${this.apiUrl}punch_out/`, {});
    }

    startBreak(): Observable<TimeEntry> {
        return this.http.post<TimeEntry>(`${this.apiUrl}start_break/`, {});
    }

    endBreak(): Observable<TimeEntry> {
        return this.http.post<TimeEntry>(`${this.apiUrl}end_break/`, {});
    }

    // --- Time Correction Requests ---
    private readonly correctionUrl = `${environment.apiUrl}time-corrections/`;

    getCorrectionRequests(page = 1): Observable<PaginatedResponse<TimeCorrectionRequest>> {
        const params = new HttpParams().set('page', page);
        return this.http.get<PaginatedResponse<TimeCorrectionRequest>>(this.correctionUrl, { params });
    }

    getAllCorrectionRequests(): Observable<TimeCorrectionRequest[]> {
        return this.http.get<TimeCorrectionRequest[]>(this.correctionUrl, {
            params: new HttpParams().set('page_size', '0'),
        });
    }

    createCorrectionRequest(req: TimeCorrectionRequest): Observable<TimeCorrectionRequest> {
        return this.http.post<TimeCorrectionRequest>(this.correctionUrl, req);
    }

    approveCorrection(id: number): Observable<TimeCorrectionRequest> {
        return this.http.post<TimeCorrectionRequest>(`${this.correctionUrl}${id}/approve/`, {});
    }

    denyCorrection(id: number): Observable<TimeCorrectionRequest> {
        return this.http.post<TimeCorrectionRequest>(`${this.correctionUrl}${id}/deny/`, {});
    }
}
