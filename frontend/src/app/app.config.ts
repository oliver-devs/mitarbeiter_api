import { ApplicationConfig, LOCALE_ID } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { DateAdapter, MAT_DATE_LOCALE, MAT_DATE_FORMATS } from '@angular/material/core';
import { authInterceptor } from './auth/auth.interceptor';
import { GermanDateAdapter } from './shared/german-date-adapter';
import localeDe from '@angular/common/locales/de';
import { registerLocaleData } from '@angular/common';

registerLocaleData(localeDe);

const GERMAN_DATE_FORMATS = {
    parse: { dateInput: 'dd.MM.yyyy' },
    display: {
        dateInput: 'dd.MM.yyyy',
        monthYearLabel: 'MMM yyyy',
        dateA11yLabel: 'dd.MM.yyyy',
        monthYearA11yLabel: 'MMMM yyyy',
    },
};

export const appConfig: ApplicationConfig = {
    providers: [
        provideRouter(routes),
        provideAnimations(),
        provideHttpClient(withInterceptors([authInterceptor])),
        { provide: LOCALE_ID, useValue: 'de-DE' },
        { provide: MAT_DATE_LOCALE, useValue: 'de-DE' },
        { provide: DateAdapter, useClass: GermanDateAdapter },
        { provide: MAT_DATE_FORMATS, useValue: GERMAN_DATE_FORMATS },
    ],
};
