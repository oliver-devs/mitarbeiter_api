import { Injectable, signal } from '@angular/core';

export interface CompanyData {
    name: string;
    softwareName: string;
    logoUrl: string;
    vacationDays: number;
    workingHours: number;
}

@Injectable({
    providedIn: 'root'
})
export class CompanyService {
    private readonly STORAGE_KEY = 'hrsys_company_data';

    readonly companyData = signal<CompanyData>({
        name: 'Nexus Dynamics',
        softwareName: 'ClockIn',
        logoUrl: '/company-logo.svg',
        vacationDays: 30,
        workingHours: 40,
    });

    constructor() {
        this.loadFromStorage();
    }

    private loadFromStorage() {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        if (stored) {
            try {
                this.companyData.set(JSON.parse(stored));
            } catch {
                localStorage.removeItem(this.STORAGE_KEY);
            }
        }
    }

    updateCompanyData(data: CompanyData) {
        this.companyData.set({ ...data });
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    }
}
