import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { EmployeeService } from './employee.service';
import { Employee } from './models';
import { environment } from '../../environments/environment';

describe('EmployeeService', () => {
    let service: EmployeeService;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(), provideHttpClientTesting()],
        });
        service = TestBed.inject(EmployeeService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpMock.verify());

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('getEmployees calls correct URL with pagination', () => {
        service.getEmployees().subscribe();
        const req = httpMock.expectOne((r) => r.url === `${environment.apiUrl}employees/`);
        expect(req.request.method).toBe('GET');
        expect(req.request.params.get('page')).toBe('1');
        req.flush({ count: 0, next: null, previous: null, results: [] });
    });

    it('getAllEmployees calls with page_size=0', () => {
        service.getAllEmployees().subscribe((result) => {
            expect(result.length).toBe(2);
        });
        const req = httpMock.expectOne((r) => r.url === `${environment.apiUrl}employees/`);
        expect(req.request.params.get('page_size')).toBe('0');
        req.flush([
            { id: 1, first_name: 'A', last_name: 'B', email: 'a@b.de', department: 1 },
            { id: 2, first_name: 'C', last_name: 'D', email: 'c@d.de', department: 1 },
        ]);
    });

    it('createEmployee posts data', () => {
        const employee: Employee = {
            first_name: 'Max',
            last_name: 'Muster',
            email: 'max@test.de',
            department: 1,
        };

        service.createEmployee(employee).subscribe();
        const req = httpMock.expectOne(`${environment.apiUrl}employees/`);
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual(employee);
        req.flush({
            employee: { ...employee, id: 1 },
            credentials: { username: 'max.muster', password: 'abc', notice: 'Initiales Passwort' },
        });
    });
});
