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

    it('getAbsences calls correct URL with pagination', () => {
        service.getAbsences().subscribe();
        const req = httpMock.expectOne((r) => r.url === `${environment.apiUrl}absences/`);
        expect(req.request.method).toBe('GET');
        expect(req.request.params.get('page')).toBe('1');
        req.flush({ count: 0, next: null, previous: null, results: [] });
    });

    it('getAllAbsences calls with page_size=0', () => {
        service.getAllAbsences().subscribe((result) => {
            expect(result.length).toBe(0);
        });
        const req = httpMock.expectOne((r) => r.url === `${environment.apiUrl}absences/`);
        expect(req.request.params.get('page_size')).toBe('0');
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
