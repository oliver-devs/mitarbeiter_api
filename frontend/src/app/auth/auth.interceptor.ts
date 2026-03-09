import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const token = localStorage.getItem('token');
    return next(token ? req.clone({ setHeaders: { Authorization: `Token ${token}` } }) : req);
};
