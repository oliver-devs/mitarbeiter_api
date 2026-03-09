import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const staffGuard: CanActivateFn = () =>
    inject(AuthService).isManagement() || inject(Router).createUrlTree(['/dashboard']);
