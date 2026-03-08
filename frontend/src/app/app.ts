import { Component, inject, effect } from '@angular/core';
import { RouterOutlet, RouterModule } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatDivider } from '@angular/material/divider';
import { AuthService } from './auth/auth.service';
import { ThemeService } from './shared/theme.service';
import { CompanyService } from './shared/company.service';

@Component({
    selector: 'app-root',
    imports: [
        RouterOutlet,
        RouterModule,
        MatSidenavModule,
        MatListModule,
        MatIconModule,
        MatButtonModule,
        MatToolbarModule,
        MatDivider,
    ],
    templateUrl: './app.html',
    styleUrl: './app.css',
})
export class AppComponent {
    readonly auth = inject(AuthService);
    readonly theme = inject(ThemeService);
    readonly companyService = inject(CompanyService);
    private readonly titleService = inject(Title);

    constructor() {
        // Synchronize browser tab title and favicon with settings
        effect(() => {
            const data = this.companyService.companyData();
            
            // Set Title
            const name = data.softwareName || 'HRSys';
            this.titleService.setTitle(name);

            // Set Favicon
            const link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
            if (link) {
                link.href = data.logoUrl;
            }
        });
    }

    logout() {
        this.auth.logout();
    }
}
