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

    it('getEmployees calls correct URL', () => {
        service.getEmployees().subscribe();
        const req = httpMock.expectOne(`${environment.apiUrl}employees/`);
        expect(req.request.method).toBe('GET');
        req.flush([]);
    });

    it('createEmployee posts data', () => {
        const employee: Employee = {
            first_name: 'Max',
            last_name: 'Muster',
            email: 'max@test.de',
            department: 'IT',
        };

        service.createEmployee(employee).subscribe();
        const req = httpMock.expectOne(`${environment.apiUrl}employees/`);
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual(employee);
        req.flush({ ...employee, id: 1, initial_username: 'max.muster', initial_password: 'abc' });
    });
});
