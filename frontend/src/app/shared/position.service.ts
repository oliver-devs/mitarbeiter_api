import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Position } from './models';

@Injectable({
    providedIn: 'root',
})
export class PositionService {
    private readonly http = inject(HttpClient);
    private readonly apiUrl = environment.apiUrl;

    getPositions() {
        return this.http.get<Position[]>(`${this.apiUrl}positions/`);
    }

    createPosition(position: Partial<Position>) {
        return this.http.post<Position>(`${this.apiUrl}positions/`, position);
    }

    updatePosition(id: number, position: Partial<Position>) {
        return this.http.put<Position>(`${this.apiUrl}positions/${id}/`, position);
    }

    deletePosition(id: number) {
        return this.http.delete<void>(`${this.apiUrl}positions/${id}/`);
    }
}
