import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AbsenceService } from './absence.service';
import { environment } from '../../environments/environment';

describe('AbsenceService', () => {
    let service: AbsenceService;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(), provideHttpClientTesting()],
        });
        service = TestBed.inject(AbsenceService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpMock.verify());

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('getAbsences calls correct URL', () => {
        service.getAbsences().subscribe();
        const req = httpMock.expectOne(`${environment.apiUrl}absences/`);
        expect(req.request.method).toBe('GET');
        req.flush([]);
    });

    it('approveAbsence posts to correct URL', () => {
        service.approveAbsence(42).subscribe();
        const req = httpMock.expectOne(`${environment.apiUrl}absences/42/approve/`);
        expect(req.request.method).toBe('POST');
        req.flush({});
    });

    it('denyAbsence posts to correct URL', () => {
        service.denyAbsence(7).subscribe();
        const req = httpMock.expectOne(`${environment.apiUrl}absences/7/deny/`);
        expect(req.request.method).toBe('POST');
        req.flush({});
    });
});
