import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TimeService } from './time.service';
import { environment } from '../../environments/environment';

describe('TimeService', () => {
    let service: TimeService;
    let httpMock: HttpTestingController;
    const apiUrl = `${environment.apiUrl}time-entries/`;
    const correctionUrl = `${environment.apiUrl}time-corrections/`;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(), provideHttpClientTesting()],
        });
        service = TestBed.inject(TimeService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpMock.verify());

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('getEntriesForEmployee calls with employee and page params', () => {
        service.getEntriesForEmployee(5, 2).subscribe();
        const req = httpMock.expectOne(r => r.url === apiUrl);
        expect(req.request.params.get('employee')).toBe('5');
        expect(req.request.params.get('page')).toBe('2');
        req.flush({ count: 0, next: null, previous: null, results: [] });
    });

    it('getAllEntriesForEmployee calls with page_size=0', () => {
        service.getAllEntriesForEmployee(3).subscribe(result => {
            expect(result.length).toBe(0);
        });
        const req = httpMock.expectOne(r => r.url === apiUrl);
        expect(req.request.params.get('page_size')).toBe('0');
        expect(req.request.params.get('employee')).toBe('3');
        req.flush([]);
    });

    it('punchIn posts to base URL', () => {
        service.punchIn().subscribe();
        const req = httpMock.expectOne(apiUrl);
        expect(req.request.method).toBe('POST');
        req.flush({});
    });

    it('punchOut posts to punch_out endpoint', () => {
        service.punchOut().subscribe();
        const req = httpMock.expectOne(`${apiUrl}punch_out/`);
        expect(req.request.method).toBe('POST');
        req.flush({});
    });

    it('startBreak posts to start_break endpoint', () => {
        service.startBreak().subscribe();
        const req = httpMock.expectOne(`${apiUrl}start_break/`);
        expect(req.request.method).toBe('POST');
        req.flush({});
    });

    it('endBreak posts to end_break endpoint', () => {
        service.endBreak().subscribe();
        const req = httpMock.expectOne(`${apiUrl}end_break/`);
        expect(req.request.method).toBe('POST');
        req.flush({});
    });

    it('approveCorrection posts to correct URL', () => {
        service.approveCorrection(10).subscribe();
        const req = httpMock.expectOne(`${correctionUrl}10/approve/`);
        expect(req.request.method).toBe('POST');
        req.flush({});
    });

    it('denyCorrection posts to correct URL', () => {
        service.denyCorrection(7).subscribe();
        const req = httpMock.expectOne(`${correctionUrl}7/deny/`);
        expect(req.request.method).toBe('POST');
        req.flush({});
    });
});
