import { Component, inject } from '@angular/core';
import { MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Employee } from './models';

@Component({
    selector: 'app-employee-info-dialog',
    imports: [MatDialogModule, MatButtonModule, MatIconModule],
    template: `
        <div class="employee-info-container">
            <header class="dialog-header">
                <button mat-icon-button mat-dialog-close class="close-btn">
                    <mat-icon>close</mat-icon>
                </button>
                <div class="avatar-large">
                    {{ data.first_name.charAt(0) }}{{ data.last_name.charAt(0) }}
                </div>
                <h2>{{ data.first_name }} {{ data.last_name }}</h2>
                <span class="position-badge">{{ data.position_title || 'Mitarbeiter' }}</span>
            </header>

            <mat-dialog-content class="info-content">
                <div class="info-list">
                    <div class="info-row">
                        <div class="icon-box">
                            <mat-icon>domain</mat-icon>
                        </div>
                        <div class="info-text">
                            <label>Abteilung</label>
                            <span>{{ data.department_name || '-' }}</span>
                        </div>
                    </div>

                    <div class="info-row">
                        <div class="icon-box">
                            <mat-icon>email</mat-icon>
                        </div>
                        <div class="info-text">
                            <label>E-Mail</label>
                            <a [href]="'mailto:' + data.email">{{ data.email }}</a>
                        </div>
                    </div>

                    <div class="info-row">
                        <div class="icon-box">
                            <mat-icon>calendar_today</mat-icon>
                        </div>
                        <div class="info-text">
                            <label>Im Unternehmen seit</label>
                            <span>{{ formatDate(data.created_at) }}</span>
                        </div>
                    </div>
                </div>
            </mat-dialog-content>
        </div>
    `,
    styles: [`
        .employee-info-container {
            padding: 16px;
            min-width: 350px;
        }
        .dialog-header {
            position: relative;
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            margin-block-end: 32px;
            padding-block-start: 8px;
        }
        .close-btn {
            position: absolute;
            inset-block-start: -8px;
            inset-inline-end: -8px;
            color: var(--mat-sys-on-surface-variant);
        }
        .avatar-large {
            width: 80px;
            aspect-ratio: 1;
            background: var(--mat-sys-primary-container);
            color: var(--mat-sys-on-primary-container);
            border-radius: 50%;
            display: grid;
            place-items: center;
            font-size: 32px;
            font-weight: 700;
            margin-block-end: 16px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        h2 {
            margin: 0;
            font-size: 1.5rem;
            font-weight: 200;
            color: var(--mat-sys-on-surface);
        }
        .position-badge {
            font-size: 0.95rem;
            color: var(--mat-sys-primary);
            font-weight: 500;
            margin-block-start: 4px;
        }
        
        .info-content {
            padding: 0 16px 16px !important;
            overflow: visible !important;
        }
        .info-list {
            display: flex;
            flex-direction: column;
            gap: 24px;
            width: 100%;
            align-items: flex-start;
        }
        .info-row {
            display: flex;
            align-items: center;
            gap: 20px;
            width: 100%;
            text-align: start;
        }
        .icon-box {
            width: 44px;
            aspect-ratio: 1;
            background: var(--mat-sys-surface-container-low);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }
        .icon-box mat-icon {
            color: var(--mat-sys-primary);
            opacity: 0.8;
            font-size: 22px;
            width: 22px;
            height: 22px;
        }
        .info-text {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            text-align: start;
            gap: 0; /* Keinen Abstand mehr zwischen Label und Wert */
        }
        .info-text label {
            display: block;
            width: 100%;
            text-align: start;
            font-size: 0.7rem;
            text-transform: uppercase;
            font-weight: 200;
            letter-spacing: 0.08em;
            color: var(--mat-sys-on-surface-variant);
            margin-block-end: -2px; /* Zieht den Wert noch etwas näher ran */
        }
        .info-text span, .info-text a {
            display: block;
            width: 100%;
            text-align: start;
            font-size: 1.05rem;
            font-weight: 500;
            color: var(--mat-sys-on-surface);
            text-decoration: none;
        }
        .info-text a:hover {
            color: var(--mat-sys-primary);
            text-decoration: underline;
        }
    `]
})
export class EmployeeInfoDialogComponent {
    readonly data = inject<Employee>(MAT_DIALOG_DATA);
    
    formatDate(dateStr?: string): string {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('de-DE', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });
    }
}
