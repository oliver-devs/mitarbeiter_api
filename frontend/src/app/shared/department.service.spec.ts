import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DepartmentService } from './department.service';
import { environment } from '../../environments/environment';

describe('DepartmentService', () => {
    let service: DepartmentService;
    let httpMock: HttpTestingController;
    const apiUrl = `${environment.apiUrl}departments/`;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(), provideHttpClientTesting()],
        });
        service = TestBed.inject(DepartmentService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpMock.verify());

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('getDepartments calls correct URL', () => {
        service.getDepartments().subscribe(result => {
            expect(result.length).toBe(1);
        });
        const req = httpMock.expectOne(apiUrl);
        expect(req.request.method).toBe('GET');
        req.flush([{ id: 1, name: 'IT', description: '' }]);
    });

    it('createDepartment posts data', () => {
        const dept = { name: 'HR', description: 'Human Resources' };
        service.createDepartment(dept).subscribe();
        const req = httpMock.expectOne(apiUrl);
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual(dept);
        req.flush({ id: 2, ...dept });
    });

    it('updateDepartment puts data', () => {
        const dept = { id: 1, name: 'IT Updated', description: '' };
        service.updateDepartment(1, dept).subscribe();
        const req = httpMock.expectOne(`${apiUrl}1/`);
        expect(req.request.method).toBe('PUT');
        req.flush(dept);
    });

    it('deleteDepartment calls correct URL', () => {
        service.deleteDepartment(3).subscribe();
        const req = httpMock.expectOne(`${apiUrl}3/`);
        expect(req.request.method).toBe('DELETE');
        req.flush(null);
    });
});
