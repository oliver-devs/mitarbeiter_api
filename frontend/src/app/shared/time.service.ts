import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

export interface TimeEntry {
    id?: number;
    employee: number;
    employee_name?: string;
    date?: string;
    start_time: string;
    end_time?: string | null;
}

@Injectable({ providedIn: 'root' })
export class TimeService {
    private readonly http = inject(HttpClient);
    private readonly apiUrl = `${environment.apiUrl}time-entries/`;

    getEntriesForEmployee(employeeId: number): Observable<TimeEntry[]> {
        return this.http.get<TimeEntry[]>(`${this.apiUrl}?employee=${employeeId}`);
    }

    punchIn(): Observable<TimeEntry> {
        // Create an entry (punch in)
        return this.http.post<TimeEntry>(this.apiUrl, {});
    }

    punchOut(): Observable<TimeEntry> {
        // Update the open entry (punch out)
        return this.http.post<TimeEntry>(`${this.apiUrl}punch_out/`, {});
    }
}
